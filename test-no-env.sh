#!/bin/bash

# Test script to start the application without .env file for CI/CD simulation
export NODE_ENV=test
export MONGODB_URI=""
export ENCRYPTION_KEY=""
export ENCRYPTION_IV=""

node server.js
