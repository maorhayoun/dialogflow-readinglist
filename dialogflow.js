// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const rp = require('request-promise');
const GetPocket = require('node-getpocket');
const read = require('node-readability');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
 
const handlers = { 
    "pocket": { 
        "topics": getPocketTopics,
        "post": getPocketPost
    },
    "chrome": {}
}

function getPocketTopics(count) {
  return new Promise((resolve, reject) => {
      // todo: make request
    console.log("number of articals " + count)
    var params = {
        consumer_key: '81184-7e5a980bd10d6d51cfc3494e',
        access_token: '01c842b4-cc77-1bf7-30e4-85bc93',
        count: count,
        detailType: 'complete'
        // get/retrieve/search parameters
    };
    var pocket = new GetPocket(params);
    pocket.get(params, function(err, resp) {
        if (err) {
            console.log("error in get pocket response: " + err)
        }
        
        console.log("got response: " + resp)

        // check err or handle the response
        var list = resp.list;
        var titles = Object.keys(list).map(k => 
        {
            var i = list[k];
            return {
                id: i.item_id,
                title: i.resolved_title
            }
        });
        
         resolve(titles);
    });
    
    //   let output = [{
    //      "id": "pocket-1",
    //      "topic": "This is topic 1" 
    //   }, {
    //      "id": "pocket-2",          
    //       "topic": "This is topic 2 asfkjasldfkjsalkdfjaskdlfjasldkf eroiwjiowjeiorjwioer vcfsdfs"
    //   }];
     // resolve(titles);
  });
}

function getPocketPost(id) {
    return new Promise((resolve, reject) => {
        
        // let result = {
        //     id,
        //     "text": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
        // };
        
        let url = 'https://medium.com/software-is-eating-the-world/what-s-next-in-computing-e54b870b80cc';
        
        read(url, function(err, article, meta) {
            if (article || !article.textBody) {
              console.log(article.textBody);
              resolve({
                  id,
                  text: article.textBody.substring(0, 1000)
              });
            }
            else { 
                console.log("request for pocket post failed: " + err);
                reject("request for pocket post failed: " + err);
            }
        });
        
    });
}
  
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
}

  function getTopicsHandler(agent) {
    agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor55555!`);
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    
    //console.log('getTopicsHandler:: rl-source: ' + request.body.queryResult.parameters["rl-source"]);
    let rlsource = "pocket"; //request.body.queryResult.parameters["rl-source"].toLowerCase();
    let handler = handlers[rlsource];
    if (!handler || !handler.topics) {
        // TODO: return error
        agent.add(`I didn't understand`);
        return;
    }
  
    return handler.topics(agent.parameters.number)
        .then((resp) => {
            resp.map(t => {
                agent.add(new Suggestion(t.title));
            })
        });
  }

  function getPostHandler(agent) {
      
      let selection = request.body.queryResult.parameters.number[0];
      agent.add(`You've selected ` + selection);

      //console.log('!!!!!!!!!!got to getPostHandler!!!!!!!!');
      return getPocketPost(selection)
        .then((resp) => {
            agent.add(resp.text);
        });
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs/tree/master/samples/actions-on-google
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Get Reading List Topics', getTopicsHandler);
  intentMap.set('Get Post', getPostHandler);
  intentMap.set('Get Reading List Topics - custom', getPostHandler);
  intentMap.set('Get Reading List Topics - select.number', getPostHandler);
  intentMap.set('Get Reading List Topics - more', getPostHandler);

  agent.handleRequest(intentMap);
});
