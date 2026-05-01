#!/usr/bin/env bash

LOG_LEVEL="${LOG_LEVEL:-INFO}"
LOG_TIMESTAMP="${LOG_TIMESTAMP:-true}"

_timestamp() {
  if [[ "$LOG_TIMESTAMP" == "true" ]]; then
    date "+%Y-%m-%d %H:%M:%S"
  fi
}

_log_prefix() {
  local level="$1"
  local color="$2"
  local ts
  ts=$(_timestamp)
  if [[ -n "$ts" ]]; then
    echo -e "${color}[${ts}] [${level}]\033[0m"
  else
    echo -e "${color}[${level}]\033[0m"
  fi
}

log_debug() {
  [[ "$LOG_LEVEL" == "DEBUG" ]] || return 0
  echo "$(_log_prefix "DEBUG" "\033[0;36m") $*"
}

log_info() {
  echo "$(_log_prefix "INFO" "\033[1;34m") $*"
}

log_success() {
  echo "$(_log_prefix "SUCCESS" "\033[1;32m") ✓ $*"
}

log_warn() {
  echo "$(_log_prefix "WARN" "\033[1;33m") ⚠ $*" >&2
}

log_error() {
  echo "$(_log_prefix "ERROR" "\033[1;31m") ✗ $*" >&2
}

log_skip() {
  echo "$(_log_prefix "SKIP" "\033[0;33m") ⏭ $*"
}

log_step() {
  local step="$1"
  local total="$2"
  local desc="$3"
  echo ""
  echo "$(_log_prefix "STEP" "\033[1;35m") [$step/$total] $desc"
}

log_section() {
  echo ""
  echo -e "\033[1;36m═══════════════════════════════════════════════════════════════\033[0m"
  echo -e "\033[1;36m  $*\033[0m"
  echo -e "\033[1;36m═══════════════════════════════════════════════════════════════\033[0m"
}

log_result() {
  local label="$1"
  local value="$2"
  echo -e "  \033[0;37m$label:\033[0m \033[1;37m$value\033[0m"
}
