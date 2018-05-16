#!/bin/bash

#/
# Copyright 2016 IBM Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#/

set -e
set -x

if [ $# -ne 2 ]
then
  echo "Usage: ./uninstall.sh $API_HOST $AUTH_KEY"
  exit 1
fi

API_HOST="$1"
AUTH_KEY="$2"
WSK_CLI="$3"

PACKAGE_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo Uninstalling Watson MQTT Package \

bx wsk --apihost "$API_HOST" action delete \
  --auth "$AUTH_KEY"  \
  mqtt-watson/feed-action

bx wsk --apihost "$API_HOST" package delete \
  --auth "$AUTH_KEY" \
  mqtt-watson
