#!/bin/bash
open -a "Google Chrome Canary" --args --user-data-dir="/tmp/chrome-profile-$(date +%Y%m%d-%H%M%S)" --enable-features=AIPromptAPI,AIPromptAPIMultimodalInput,AIRewriterAPI,AIWriterAPI,TranslationAPI
