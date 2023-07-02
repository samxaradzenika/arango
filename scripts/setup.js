"use strict";

const db = require("@arangodb").db;
const collectionName = "sessionDetails";

if (!db._collection(collectionName)) {
  db._createDocumentCollection(collectionName);
}
