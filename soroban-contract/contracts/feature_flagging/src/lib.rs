//! Feature Flagging Contract for Soroban
//!
//! This contract provides a system for enabling or disabling features
//! dynamically, allowing for controlled rollouts, A/B testing, and feature management.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Symbol, Vec,
};

use upgradeable as upg;

/// Errors that can occur in feature flagging operations
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    FeatureNotFound = 3,
    AlreadyInitialized = 4,
    InvalidFeatureName = 5,
    EventIdNotFound = 6,
}

/// Represents the status of a feature
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeatureStatus {
    pub name: String,
    pub enabled: bool,
    pub created_at: u64,
    pub updated_at: u64,
    pub description: String,
}

/// Event emitted when a feature is enabled or disabled
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeatureToggleEvent {
    pub contract_address: Address,
    pub feature_name: String,
    pub enabled: bool,
    pub toggled_at: u64,
    pub admin: Address,
}

/// Event emitted when a feature is created
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeatureCreatedEvent {
    pub contract_address: Address,
    pub feature_name: String,
    pub description: String,
    pub enabled: bool,
    pub created_at: u64,
}

/// Data storage keys
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Admin address (set once in initialization)
    Admin,
    /// Feature status by name
    Feature(String),
    /// List of all feature names
    FeatureList,
    /// Configuration by event ID
    EventConfig(u32),
}

#[contract]
pub struct FeatureFlagging;

#[contractimpl]
impl FeatureFlagging {
    /// Initialize the feature flagging contract with an admin
    pub fn __constructor(env: Env, admin: Address) {
        upg::set_admin(&env, &admin);
        upg::init_version(&env);

        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin);

        let empty_list: Vec<String> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&DataKey::FeatureList, &empty_list);

        upg::extend_instance_ttl(&env);
    }

    /// Get the admin address
    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Create a new feature flag
    pub fn create_feature(
        env: Env,
        name: String,
        description: String,
        enabled: bool,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if name.len() == 0 {
            return Err(Error::InvalidFeatureName);
        }

        // Check if feature already exists
        if env
            .storage()
            .persistent()
            .has(&DataKey::Feature(name.clone()))
        {
            return Err(Error::FeatureNotFound);
        }

        let now = env.ledger().timestamp();
        let feature = FeatureStatus {
            name: name.clone(),
            enabled,
            created_at: now,
            updated_at: now,
            description: description.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Feature(name.clone()), &feature);

        // Add to feature list
        let mut feature_list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::FeatureList)
            .unwrap_or_else(|| Vec::new(&env));

        if !feature_list.iter().any(|f| f == &name) {
            feature_list.push_back(name.clone());
            env.storage()
                .instance()
                .set(&DataKey::FeatureList, &feature_list);
        }

        let event = FeatureCreatedEvent {
            contract_address: env.current_contract_address(),
            feature_name: name,
            description,
            enabled,
            created_at: now,
        };

        env.events()
            .publish((Symbol::new(&env, "FeatureCreated"),), event);

        upg::extend_instance_ttl(&env);

        Ok(())
    }

    /// Enable a feature
    pub fn enable_feature(env: Env, name: String) -> Result<(), Error> {
        Self::set_feature_status(env, name, true)
    }

    /// Disable a feature
    pub fn disable_feature(env: Env, name: String) -> Result<(), Error> {
        Self::set_feature_status(env, name, false)
    }

    /// Set feature status (internal helper)
    fn set_feature_status(env: Env, name: String, enabled: bool) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut feature: FeatureStatus = env
            .storage()
            .persistent()
            .get(&DataKey::Feature(name.clone()))
            .ok_or(Error::FeatureNotFound)?;

        feature.enabled = enabled;
        feature.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Feature(name.clone()), &feature);

        let event = FeatureToggleEvent {
            contract_address: env.current_contract_address(),
            feature_name: name,
            enabled,
            toggled_at: env.ledger().timestamp(),
            admin: admin.clone(),
        };

        env.events()
            .publish((Symbol::new(&env, "FeatureToggled"),), event);

        upg::extend_instance_ttl(&env);

        Ok(())
    }

    /// Check if a feature is enabled
    pub fn is_enabled(env: Env, name: String) -> Result<bool, Error> {
        let feature: FeatureStatus = env
            .storage()
            .persistent()
            .get(&DataKey::Feature(name))
            .ok_or(Error::FeatureNotFound)?;

        Ok(feature.enabled)
    }

    /// Get feature status
    pub fn get_feature(env: Env, name: String) -> Result<FeatureStatus, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Feature(name))
            .ok_or(Error::FeatureNotFound)
    }

    /// Get all feature names
    pub fn list_features(env: Env) -> Result<Vec<String>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::FeatureList)
            .ok_or(Error::NotInitialized)
    }

    /// Set feature status for a specific event (event-scoped features)
    pub fn set_event_feature(
        env: Env,
        event_id: u32,
        feature_name: String,
        enabled: bool,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if feature_name.len() == 0 {
            return Err(Error::InvalidFeatureName);
        }

        let mut config: Vec<(String, bool)> = env
            .storage()
            .persistent()
            .get(&DataKey::EventConfig(event_id))
            .unwrap_or_else(|| Vec::new(&env));

        // Find and update or add the feature
        let mut found = false;
        for i in 0..config.len() {
            let (name, _) = config.get(i).unwrap();
            if name == feature_name {
                config.set(i, (feature_name.clone(), enabled));
                found = true;
                break;
            }
        }

        if !found {
            config.push_back((feature_name.clone(), enabled));
        }

        env.storage()
            .persistent()
            .set(&DataKey::EventConfig(event_id), &config);

        let event = FeatureToggleEvent {
            contract_address: env.current_contract_address(),
            feature_name,
            enabled,
            toggled_at: env.ledger().timestamp(),
            admin: admin.clone(),
        };

        env.events()
            .publish((Symbol::new(&env, "FeatureToggled"),), event);

        upg::extend_instance_ttl(&env);

        Ok(())
    }

    /// Check if a feature is enabled for a specific event
    pub fn is_event_feature_enabled(
        env: Env,
        event_id: u32,
        feature_name: String,
    ) -> Result<bool, Error> {
        let config: Vec<(String, bool)> = env
            .storage()
            .persistent()
            .get(&DataKey::EventConfig(event_id))
            .ok_or(Error::EventIdNotFound)?;

        for i in 0..config.len() {
            let (name, enabled) = config.get(i).unwrap();
            if name == feature_name {
                return Ok(enabled);
            }
        }

        // If feature not found in event config, fall back to global feature status
        Self::is_enabled(env, feature_name)
    }

    /// Require a feature to be enabled (helper for other contracts)
    pub fn require_feature_enabled(env: Env, name: String) -> Result<(), Error> {
        match Self::is_enabled(env, name) {
            Ok(true) => Ok(()),
            Ok(false) => Err(Error::FeatureNotFound),
            Err(e) => Err(e),
        }
    }

    /// Get all features
    pub fn get_all_features(env: Env) -> Result<Vec<FeatureStatus>, Error> {
        let feature_names: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::FeatureList)
            .ok_or(Error::NotInitialized)?;

        let mut features = Vec::new(&env);

        for i in 0..feature_names.len() {
            let name = feature_names.get(i).unwrap();
            if let Ok(feature) = env
                .storage()
                .persistent()
                .get::<_, FeatureStatus>(&DataKey::Feature(name.clone()))
            {
                features.push_back(feature);
            }
        }

        Ok(features)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_values() {
        assert_eq!(Error::NotInitialized as u32, 1);
        assert_eq!(Error::Unauthorized as u32, 2);
        assert_eq!(Error::FeatureNotFound as u32, 3);
    }
}
