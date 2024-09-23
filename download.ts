// Before calling the API, replace filename and ensure sdk is installed: "npm install unstructured-client"
// See https://docs.unstructured.io/api-reference/api-services/sdk for more details

import { UnstructuredClient } from "unstructured-client";
import { type PartitionResponse } from "unstructured-client/sdk/models/operations";
import { Strategy } from "unstructured-client/sdk/models/shared";
import * as fs from "fs";

const key = "dxAPYYYllT1ViDJzIYe3LMgdCmeUq4";

const client = new UnstructuredClient({
  serverURL: "https://api.unstructuredapp.io",
  security: {
    apiKeyAuth: key,
  },
});

const filename = "/Users/lixiangyi/Downloads/example-2.pdf";
const data = fs.readFileSync(filename);

client.general
  .partition({
    partitionParameters: {
      files: {
        content: data,
        fileName: filename,
      },
      strategy: Strategy.HiRes,
    },
  })
  .then((res: PartitionResponse) => {
    if (res.statusCode == 200) {
      console.log(res.elements);
    }
  })
  .catch((e) => {
    console.log(e.statusCode);
    console.log(e.body);
  });
