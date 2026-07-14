#!/bin/bash
# Kivan tutorial — one-shot prerequisite setup for macOS.
#
# Idempotent: installs whatever is missing, skips whatever is already there.
# Safe to re-run at any time. Nothing here is destructive.
#
#   ./setup.sh
#
set -uo pipefail

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; DIM=$'\033[2m'; NC=$'\033[0m'
ok()      { echo "  ${GREEN}✓${NC} $1"; }
installs() { echo "  ${YELLOW}↓${NC} installing $1 ..."; }
fail()    { echo "  ${RED}✗${NC} $1"; }
TODOS=()
todo()    { TODOS+=("$1"); }

echo "${BOLD}Kivan setup — checking your machine${NC}"
ARCH=$(uname -m)

# ---------------------------------------------------------------- Homebrew
if command -v brew >/dev/null 2>&1; then
  ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"
else
  installs "Homebrew"
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
      fail "Homebrew install failed — see https://brew.sh"; exit 1; }
fi
# Make brew available in THIS shell (fresh installs aren't on PATH yet)
if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
if [ -x /usr/local/bin/brew ];   then eval "$(/usr/local/bin/brew shellenv)";   fi

brew_install() {  # brew_install <formula> [command-to-check]
  local formula=$1 check=${2:-$1}
  if command -v "$check" >/dev/null 2>&1; then
    ok "$formula"
  else
    installs "$formula"
    brew install "$formula" || fail "brew install $formula failed"
  fi
}

# ------------------------------------------------- Xcode command line tools
if xcode-select -p >/dev/null 2>&1; then
  ok "Xcode command line tools"
else
  installs "Xcode command line tools (a macOS dialog will open)"
  xcode-select --install >/dev/null 2>&1 || true
  todo "Finish the Xcode command line tools dialog, then re-run ./setup.sh"
fi

# ------------------------------------------------------------- Full Xcode
if [ -d /Applications/Xcode.app ]; then
  ok "Xcode.app"
  if xcrun simctl list devices available 2>/dev/null | grep -q "iPhone"; then
    ok "iOS simulator runtime"
  else
    todo "Install an iOS simulator runtime: Xcode ▸ Settings ▸ Components"
  fi
else
  todo "Install Xcode from the App Store, open it once, then: Xcode ▸ Settings ▸ Components ▸ install an iOS simulator runtime"
fi

# ------------------------------------------------------------------- Node
if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -ge 20 ]; then
  ok "Node $(node -v)"
else
  installs "Node.js"
  brew install node || fail "brew install node failed"
fi

# --------------------------------------------------------------- Python 3.12
# (3.13+ cannot install the backend's pinned pydantic — we need 3.11/3.12)
if command -v python3.12 >/dev/null 2>&1; then
  ok "Python $(python3.12 --version | awk '{print $2}')"
elif command -v python3.11 >/dev/null 2>&1; then
  ok "Python $(python3.11 --version | awk '{print $2}')"
else
  installs "python@3.12"
  brew install python@3.12 || fail "brew install python@3.12 failed"
fi

# ---------------------------------------------------------------- Terraform
if command -v terraform >/dev/null 2>&1; then
  ok "Terraform $(terraform version -json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["terraform_version"])' 2>/dev/null || terraform version | head -1)"
else
  installs "Terraform"
  brew tap hashicorp/tap >/dev/null 2>&1
  brew install hashicorp/tap/terraform || fail "terraform install failed"
fi

# ------------------------------------------------------------------ AWS CLI
brew_install awscli aws
if aws sts get-caller-identity >/dev/null 2>&1; then
  ok "AWS credentials (account $(aws sts get-caller-identity --query Account --output text))"
else
  todo "Configure AWS credentials: create an IAM user with AdministratorAccess + access key, then run: aws configure"
fi

# ------------------------------------------------- Docker / Colima / buildx
brew_install colima
brew_install docker
if docker buildx version >/dev/null 2>&1; then ok "docker-buildx"; else installs "docker-buildx"; brew install docker-buildx || true; fi
brew_install watchman   # file watcher — Metro/Expo work much better with it

# ------------------------------------------------------ Rosetta (Apple Silicon)
if [ "$ARCH" = "arm64" ]; then
  if /usr/bin/pgrep -q oahd; then
    ok "Rosetta 2"
  else
    installs "Rosetta 2"
    softwareupdate --install-rosetta --agree-to-license || fail "Rosetta install failed"
  fi

  # The colima 'rosetta' profile builds the amd64 images App Runner needs.
  # (QEMU / docker-container builders corrupt layers — see the README warning.)
  if colima list 2>/dev/null | grep -q "^rosetta.*Running"; then
    ok "colima rosetta profile (running)"
  elif colima list 2>/dev/null | grep -q "^rosetta"; then
    installs "starting colima rosetta profile"
    colima start rosetta || fail "colima start rosetta failed"
  else
    installs "colima rosetta profile (first start takes a few minutes)"
    colima start rosetta --vm-type vz --vz-rosetta --arch aarch64 --cpu 4 --memory 6 \
      || fail "colima rosetta profile failed"
  fi
  docker context use colima-rosetta >/dev/null 2>&1 && ok "docker context → colima-rosetta"
else
  # Intel Macs build amd64 natively
  if colima list 2>/dev/null | grep -q "Running"; then ok "colima (running)"; else
    installs "starting colima"; colima start || fail "colima start failed"; fi
fi

# ------------------------------------------------------------------ Accounts
echo ""
echo "${BOLD}Accounts & keys${NC} ${DIM}(scripts can't create these for you)${NC}"
todo "Clerk (step 04): dashboard.clerk.com → create app → enable Email + Google → copy Publishable key (frontend/.env.local) and Secret key (infra/terraform.tfvars)"
todo "Firecrawl (step 09): firecrawl.dev → copy API key into infra/terraform.tfvars"
todo "Mailgun (step 12, optional): mailgun.com → sandbox domain + API key into infra/terraform.tfvars; add yourself as an authorized recipient"

# ------------------------------------------------------------------ Summary
echo ""
if [ ${#TODOS[@]} -eq 0 ]; then
  echo "${GREEN}${BOLD}Everything is ready.${NC} Continue to step-02."
else
  echo "${BOLD}Remaining manual items:${NC}"
  i=1
  for t in "${TODOS[@]}"; do echo "  ${YELLOW}$i.${NC} $t"; i=$((i+1)); done
  echo ""
  echo "Re-run ${BOLD}./setup.sh${NC} any time — it only touches what's missing."
fi
