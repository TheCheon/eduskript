#!/bin/bash

# CleverCloud pre-build hook for Eduskript

set -e

echo "🚀 Starting pre-build setup..."

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$DIR/install_pnpm.sh"