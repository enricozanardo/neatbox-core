#!/bin/bash

INPUT="../config/default/config.json"
START=0
END=$(cat $INPUT |  jq -c '.forging.delegates | length')

echo "Backing up config.."
cp "${INPUT}" "${INPUT}.bak"

echo "Generating hash unions for ${END} delegates.."

for (( c=$START; c<$END; c++ ))
do
   HASH_ONION=$(../bin/run hash-onion --count=1000000 --distance=2000)
   
   cat ${INPUT} |  jq -c ".forging.delegates[${c}].hashOnion=${HASH_ONION}" > ./tmp && mv ./tmp ${INPUT}
   
   num=$(( $c + 1 ))
   echo "${num} / ${END} done"
done

