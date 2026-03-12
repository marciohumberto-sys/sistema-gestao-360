const https = require('https');

const url = 'https://jfctiocmxydedvlgxdhg.supabase.co/rest/v1/?apikey=sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const spec = JSON.parse(data);
      const rpcs = Object.keys(spec.paths).filter(path => path.startsWith('/rpc/'));
      console.log("Available RPCs:", rpcs);
      
      const targetRpcs = ['/rpc/add_of_item', '/rpc/delete_of_item', '/rpc/recalculate_of_total', '/rpc/create_of', '/rpc/issue_of', '/rpc/cancel_of'];
      
      targetRpcs.forEach(rpc => {
          if (spec.paths[rpc] && spec.paths[rpc].post) {
              const params = spec.paths[rpc].post.parameters;
              console.log(rpc, "parameters:");
              // body parameter contains the schema
              const bodyParam = params.find(p => p.in === 'body');
              if (bodyParam && bodyParam.schema && bodyParam.schema.properties) {
                  console.log(Object.keys(bodyParam.schema.properties));
              } else {
                  console.log("No body param or properties found", bodyParam);
              }
          } else {
              console.log(rpc, "NOT FOUND in spec paths");
          }
      });
    } catch (e) {
      console.error("Error parsing JSON:", e.message);
    }
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
