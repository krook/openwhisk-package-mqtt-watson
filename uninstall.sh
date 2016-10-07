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

if [ $# -eq 0 ]
then
    echo "Usage: ./uninstall.sh $APIHOST $AUTH $WSK_CLI"
fi

APIHOST="$1"
AUTH="$2"
WSK_CLI="$3"

PACKAGE_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo Uninstalling Watson MQTT Package \

$WSK_CLI --apihost "$APIHOST" action delete --auth "$AUTH"  mqtt-watson/feed-action

$WSK_CLI --apihost "$APIHOST" package delete --auth "$AUTH" mqtt-watson 