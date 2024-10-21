import Typesense from "typesense";

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: "host url",
      port: 912,
      protocol: "https",
    },
  ],
  apiKey: "api_key",
});

export default typesenseClient;
