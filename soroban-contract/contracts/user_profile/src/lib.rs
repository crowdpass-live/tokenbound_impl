#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Symbol,
};

use upgradeable as upg;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    ProfileNotFound = 1,
    ProfileAlreadyExists = 2,
    InvalidStringInput = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Profile {
    pub owner: Address,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub avatar_uri: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
pub enum DataKey {
    Profile(Address),
}

#[contract]
pub struct UserProfile;

#[contractimpl]
impl UserProfile {
    const MAX_USERNAME_BYTES: u32 = 64;
    const MAX_DISPLAY_NAME_BYTES: u32 = 100;
    const MAX_BIO_BYTES: u32 = 500;
    const MAX_URI_BYTES: u32 = 1024;

    /// Create a profile for `user`. Caller must be `user`.
    /// Fails if a profile already exists or any string field is out of bounds.
    pub fn create_profile(
        env: Env,
        user: Address,
        username: String,
        display_name: String,
        bio: String,
        avatar_uri: String,
    ) -> Result<(), Error> {
        user.require_auth();

        let key = DataKey::Profile(user.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::ProfileAlreadyExists);
        }

        Self::validate_required_string(&username, Self::MAX_USERNAME_BYTES)?;
        Self::validate_required_string(&display_name, Self::MAX_DISPLAY_NAME_BYTES)?;
        Self::validate_optional_string(&bio, Self::MAX_BIO_BYTES)?;
        Self::validate_optional_string(&avatar_uri, Self::MAX_URI_BYTES)?;

        let now = env.ledger().timestamp();
        let profile = Profile {
            owner: user.clone(),
            username,
            display_name,
            bio,
            avatar_uri,
            created_at: now,
            updated_at: now,
        };

        env.storage().persistent().set(&key, &profile);
        upg::extend_persistent_ttl(&env, &key);

        env.events()
            .publish((Symbol::new(&env, "profile_created"),), user);

        Ok(())
    }

    /// Update one or more fields on the caller's profile.
    /// Only fields wrapped in `Some` are touched; bounds are revalidated for each.
    pub fn update_profile(
        env: Env,
        user: Address,
        username: Option<String>,
        display_name: Option<String>,
        bio: Option<String>,
        avatar_uri: Option<String>,
    ) -> Result<(), Error> {
        user.require_auth();

        let key = DataKey::Profile(user.clone());
        let mut profile: Profile = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ProfileNotFound)?;

        if let Some(u) = username {
            Self::validate_required_string(&u, Self::MAX_USERNAME_BYTES)?;
            profile.username = u;
        }
        if let Some(d) = display_name {
            Self::validate_required_string(&d, Self::MAX_DISPLAY_NAME_BYTES)?;
            profile.display_name = d;
        }
        if let Some(b) = bio {
            Self::validate_optional_string(&b, Self::MAX_BIO_BYTES)?;
            profile.bio = b;
        }
        if let Some(a) = avatar_uri {
            Self::validate_optional_string(&a, Self::MAX_URI_BYTES)?;
            profile.avatar_uri = a;
        }

        profile.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&key, &profile);
        upg::extend_persistent_ttl(&env, &key);

        env.events()
            .publish((Symbol::new(&env, "profile_updated"),), user);

        Ok(())
    }

    /// Read a stored profile. Errors if no profile exists for `user`.
    pub fn get_profile(env: Env, user: Address) -> Result<Profile, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Profile(user))
            .ok_or(Error::ProfileNotFound)
    }

    /// Whether `user` has a stored profile. Read-only convenience.
    pub fn has_profile(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&DataKey::Profile(user))
    }

    fn validate_required_string(s: &String, max_bytes: u32) -> Result<(), Error> {
        if s.is_empty() || s.len() > max_bytes {
            return Err(Error::InvalidStringInput);
        }
        Ok(())
    }

    fn validate_optional_string(s: &String, max_bytes: u32) -> Result<(), Error> {
        if s.len() > max_bytes {
            return Err(Error::InvalidStringInput);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test;
