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
#
set -e
set -x

if [ $# -eq 0 ]
then
    echo "Usage: ./install.sh $APIHOST $AUTH $WSK_CLI $PROVIDER_ENDPOINT"
fi

APIHOST="$1"
AUTH="$2"
WSK_CLI="$3"
PROVIDER_ENDPOINT="$4"

PACKAGE_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo Installing Watson MQTT Package \

$WSK_CLI --apihost $APIHOST package update --auth $AUTH --shared yes -p apiHost $APIHOST -p provider_endpoint $PROVIDER_ENDPOINT mqtt-watson \
    -a description "RSS Package" \
    -a parameters '[{"name":"provider_endpoint","required":true,"bindTime":true,"description":"Watson IoT MQTT provider host"}]'


$WSK_CLI --apihost $APIHOST action update --auth $AUTH --shared yes mqtt-watson/feed-action $PACKAGE_HOME/feeds/feed.js \
    -a feed true \
    -a description "A feed action to register for Watson IoT MQTT events meeting user specified criteria" \
    -a parameters '[{"name":"url","required":true,"bindTime":true,"description":"Source URL"},{"name":"pollingInterval","required":true,"bindTime":true,"description":"RSS polling interval"},{"name":"filter","required":false,"bindTime":true,"description":"Comma separated list of keywords to watch for"}]' \
    -a sampleInput '{"url":"http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml","pollingInterval":"2h", "filter":"Washington, Capitol"}' \
    