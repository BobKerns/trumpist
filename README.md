Welcome to Trumpist Brain
========================

## Usage

This git project contain versions of the Trumpist Brain, in the form of expanded .brz archives. This form allows unchanged portions to be shared, and changes to be tracked in git (in addition to the history that TheBrain itself keeps).

To build a .brz archive, we need to change the BrainId, to avoid potential conflicts. The bin/build command will assign a BrainID specific to your repo (stored in .git/info/brain-guid), and generate a .brz file, storing it in the build/ subdirectory.

The 'jq' JSON query command is required. It is widely used and readibly available in repositories; I used the one in macports.

## 2018-04-07

Initial export
