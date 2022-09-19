// Slimmed down version of API for Google Action
// admrGoogle calls on this API to fetch from Dynamo and write to Analytics table
// Removed unnecessary node module packages
// to speed up access to API


'use strict';

//var similarity = require('similarity');
var stringSimilarity = require('string-similarity');

// For reading and writing to AWS DynamoDB
var AWS = require("aws-sdk");
var saveIntent = "No Intent Assigned";
var saveItem = "No Item Collected";
var theFoundResponse = "";
var smsMessage = "no message entered into CMS yet";

// For analytics
var theSessionId = "Not Provided";
var theUserId = "Not Provided";

// FOR API
var theId = null;
var theItem = null;
var parameters = null;
var cleanedUp = null;
var theSplit = [];
var theType = "None";


// TWILIO SETUP
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);
const fromNumber = '+16364283320'; // ADMR
//const fromNumber ='+19894398613'; // Cavoom
//const theMessage = "testing inside of that Alexa skill";

// Setup to read from Dynamo
AWS.config.update({ region: "us-east-1" });
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var theQuestionArray = [];
var params = {};

// General Variables
var campaignName = "none";
var campaignNumber = null;
var generalResponse = "I don't know the answer to that question. Ask me any question on your mailer."; // Used in general Intent

// Text message variables
var theNumber = "Not Provided";
var theMessage = "Not Provided";
var theResponseBack = null;
//var needle = require('needle');
var theResponse = null;


// Starts Here
exports.handler = function(event,context) {

    try {
    // FOR TESTing
    // var request  = event.request;
    // var session = event.session;

        saveIntent = 'Google Test';
        saveItem = 'None yet';

        // *************   FOR LOCAL TESTING **************************
        //cleanedUp = '1&254567&helloIntent&testing some good stuff out tonight';
        
        // Grab parameters from the URL string
        parameters = event.rawQueryString;
        cleanedUp = decodeURI(parameters);

        theSplit = cleanedUp.split("&");
        theId = theSplit[0]; // The Campaign Number
        theItem = theSplit[1]; // The Slot or sms message if text
        theType = theSplit[2]; // The Type of Intent
        smsMessage = theSplit[3]; // The SMS Message






        // *********** NUMBER INTENT
            if(theType == "numberIntent"){
            //console.log('number intent');
            saveIntent = "Campaign Number";
            saveItem = "No Item";
            
            if(theId){
                saveItem = theId;


            // This is the find Questions and Answers for campaign number routine
            // Pulls from DynamoDB then serves up the first question to get the dialogue going
                findQandA(saveItem,(theQuestionArray)=>{
                    
                    if(theQuestionArray.length>0){
                        campaignName = theQuestionArray[0].campaignName.S;
                        campaignNumber = theQuestionArray[0].campaignNumber.S;

                        // New
                        //theFoundResponse = "We did not find that offer. Please tell me the offer number on your mailer.";
                        // theQuestionArray.sort(function(a, b){return a.id.S - b.id.S});
                        // theFoundResponse = theQuestionArray[0].answerFromAlexa;
                        // smsMessage = theQuestionArray[1].answerFromAlexa;
                        // console.log('NUMBER: ', theQuestionArray[0].id);
                        // console.log('FOUND RESPONSE: ',theFoundResponse);
                        // console.log(theQuestionArray[0]);

                        startDiscussion((theFoundResponse)=>{

                            // Save interaction to dynamoDB
                            //analytics(saveIntent, saveItem, (stuff)=>{
                                //console.log('back from that analytics yo');
                                //console.log('theFoundResponse: ',theFoundResponse);
                                handleAPIIntent(theFoundResponse, context)
                            //}) // ends analytics
                        }) // ends start Discussion

                    } else {// ends if QuestionArray doesn't exist
                        analytics(saveIntent, saveItem, (stuff)=>{
                        //console.log('back from that analytics yo');
                        //console.log('theFoundResponse: ',theFoundResponse);
                            handleAPIIntent("Sorry, we did not find that offer number. Please say your offer number again ... ",context);
                            }) // ends analytics
                        } // ends else if array doesn't exist

                    }) // ends findQandA

                } else {// no item number = 0
                analytics(saveIntent, saveItem, (stuff)=>{
                    handleAPIIntent("Sorry, we did not find that offer number. Please say your offer number again ... ",context);
                }) // find Q&A
            }

// HELP INTENT 

} else if(theType == "helpIntent"){
    console.log('at help intent');
    saveIntent = "Help Intent";
    saveItem = "Help";
    let helperResponse = "You can ask me any question on your mailer. Just say, what's included, to start. Or, say, goodbye, to end this session."

    // analytics(saveIntent, saveItem, (stuff)=>{
    handleAPIIntent(helperResponse,context);



// HELLO INTENT 

} else if(theType == "helloIntent"){
    console.log('at hello intent');
    saveIntent = "Helo Intent";
    saveItem = "Hello";
    let helperResponse = "This is a quick API test."

    // analytics(saveIntent, saveItem, (stuff)=>{
    handleAPIIntent(helperResponse,context);

// *** TEXT ME INTENT *** 

} else if (theType == "textMeIntent") {
    console.log('at text me intent');
    saveIntent = "Text";
    

    if(theId && theId !="none"){

        if(theItem){ // Need to check that this is a phone number!!!
                theNumber = theItem;
                //console.log('numbertotext: ', theNumber);
                theMessage = smsMessage;
                //console.log('message: ',theMessage);
                
                console.log('the to ###: ',theNumber, 'message: ', theMessage);
                    // For Twilio:
                    sendThatText(theNumber,theMessage, (stuff)=>{
                        console.log('returned from send That Text fn');
                        saveIntent = "Send Text Intent";
                        saveItem = theNumber;

                            //handlePhoneIntent(options,stuff,(theResponseBack)=>{
                                //options.speechText = theResponseBack;
                                //console.log('OPTIONS: ',theResponseBack);
                                
                                analytics(saveIntent, saveItem, (stuff)=>{
                                    //Need to handle how the number is said here - use the code from the Alexa side skill on Text me!!!
                                    theNumber = theNumber.split('').join(' ');
                                    console.log('theNumber: ',theNumber);
                                    handleAPIIntent('OK. I will send your information to ' + theNumber + '. Say, text me, if this is not correct. Otherwise, ask me another question or say, goodbye, to end this session.',context);
                                    
                                //}) // find Q&A
                                //analytics(stationId, deviceId, saveIntent, saveItem, (stuff)=>{
                                    //context.succeed(buildResponse(options));
                                    //})

                                });
                })
            

        } else { // No phone slot
            var noGoodStuff = "I couldn't fulfill your request. Goodbye."
            saveIntent = "Could not send the text";
            saveItem = "Send Failure";
            // Do something if no phone number
            handlePhoneIntent(noGoodStuff,(options)=>{
                //context.succeed(buildResponse(options));
                analytics(saveIntent, saveItem, (stuff)=>{
                    context.succeed(buildResponse(options));
                    
                }) // find Q&A

            });
        } // 

} // if we have an id
// Stop and Cancel Intents


// GENERAL QUESTION INTENT

    } else if(theType == "generalIntent"){
        saveIntent = "General Question";
        //console.log("general intent");
        // Look for sessionAttributes in JSON input

        if(theId && theId !="none"){

                
                if(theItem){
                    saveItem = theItem; 

                    // ***** Go pull from Dynamo and get the questionsArray based on the campaign Number **** //
                    findQandA(theId,(theQuestionArray)=>{
                        
                    // Have a Save Item and Session Attributes
                    createArrays(theQuestionArray, (searchResults, responseResults)=>{
        
                        // Now find the best match
                        bestMatch(saveItem,searchResults, (matches)=>{
                            console.log('returned from bestMatch',matches.bestMatch);
                
                                if(matches.bestMatch.rating >= .6){
                                    generalResponse = responseResults[matches.bestMatchIndex];
                                    //console.log('generalResponse:', generalResponse);
                                    //console.log('bestmatch index: ',matches.bestMatchIndex);
                                } else {
                                    //console.log('not found');
                                    generalResponse = "I do not have an answer to that question. Try another question the list ... ";
                                    }
                            
                            analytics(saveIntent, saveItem, (stuff)=>{
                                //console.log('analytics:',stuff);
                                //handleGeneralIntent(generalResponse,context)
                                handleAPIIntent(generalResponse,context)
                                }); // end analytics

                        }) // best match

                    }) // create Arrays
                })
                
                } // If session.attributes Search Results
                    
                    // else { // No Slot Item
                    //     //saveItem = "Unknown";
                    //     generalResponse = "I don't know the answer to that one. Ask me another question from your mailing.";
                        
                    //     analytics(saveIntent, saveItem, (stuff)=>{
                    //         handleGeneralIntent(generalResponse,context)
                    //         });
                    // }

            } else // no session attributes campaign name
                {
                    //saveItem = "unknown";
                    //console.log('No session attributes campaign name found');
                    saveIntent = "General Intent Fallback";
                    saveItem = "No campaign number provided";
                    generalResponse = "Tell me the campaign number listed on the mailing";
                    analytics(saveIntent, saveItem, (stuff)=>{
                        handleGeneralIntent(generalResponse,context)
                        });

                }

            
        // } else { // No Session Attributes Campaign Number
        //     //saveItem="Unknown";
        //     //console.log('No Session Attributes');
        //     analytics(saveIntent, saveItem, (stuff)=>{
        //         handleGeneralIntent(generalResponse,context)
        //         });
        // }

        // Fallback Intent - Used when Alexa couldn't map the utterance
        } else if (request.intent.name === "AMAZON.FallbackIntent") {
            var options = {};
            //console.log('fallback intent');

            if(event.session.attributes.campaignName){
                campaignName = event.session.attributes.campaignName;
                //console.log('campaign name: ',campaignName)
            };

            if(event.session.attributes.campaignNumber){
                campaignNumber = event.session.attributes.campaignNumber;
                //console.log('campaign name: ',campaignName)
            };

            if(event.session.attributes.smsMessage){
                smsMessage = event.session.attributes.smsMessage;
                //console.log('campaign name: ',campaignName)
            };

            options.speechText = "I didn't catch that. Just say, help, for assistance.";
            options.readText = options.speechText;
            options.repromptText = "Sorry, we did not find that one. Just say, help, for assistance.";
            options.endSession = false;
            options.campaignName = campaignName;
            options.campaignNumber = campaignNumber;
            options.smsMessage = smsMessage;

            saveIntent = "Fallback Intent";
            if(!saveItem){
                saveItem = "Nothing provided";
            }


            analytics(saveIntent, saveItem, (stuff)=>{
                context.succeed(buildResponse(options))
                });

            //context.succeed(buildResponse(options))


// STOP INTENT

    } else if (request.intent.name === "AMAZON.StopIntent" || request.intent.name === "AMAZON.CancelIntent") {

        saveIntent = "Stop Intent";
        saveItem = "Stop";

        if(event.session.attributes.campaignName){
            campaignName = event.session.attributes.campaignName;
            //console.log('campaign name: ',campaignName)
        };
    
        if(event.session.attributes.campaignNumber){
            campaignNumber = event.session.attributes.campaignNumber;
            //console.log('campaign name: ',campaignName)
        };
    
        if(event.session.attributes.smsMessage){
            smsMessage = event.session.attributes.smsMessage;
            //console.log('campaign name: ',campaignName)
        };

        analytics(saveIntent, saveItem, (stuff)=>{
            handleStopIntent(context)
            
        }) // find Q&A

            //handleStopIntent(context);

        }

    //}
    // Session Ended Request
    else if (request.type === "SessionEndedRequest") {
        // added this to handle session end
        if(event.session.attributes.campaignName){
            campaignName = event.session.attributes.campaignName;
            //console.log('campaign name: ',campaignName)
        };
    
        if(event.session.attributes.campaignNumber){
            campaignNumber = event.session.attributes.campaignNumber;
            //console.log('campaign name: ',campaignName)
        };
    
        if(event.session.attributes.smsMessage){
            smsMessage = event.session.attributes.smsMessage;
            //console.log('campaign name: ',campaignName)
        };
        var options = {
            "campaignNumber": campaignName,
            "campaignName" : campaignNumber,
            "smsMessage" : smsMessage
        };
        handleEndIntent(context);


    } else {
        console.log('handling endIntent');
        handleEndIntent(context);
        throw "Unknown Intent";
    }

} catch(e) {
    console.log('error has occurred!!!');
    //context.fail("Exception: "+e);
    context.fail("Sorry about that ... Please try again.")
    //throw "Unknown Intent";
} // end catch
} // end handler

// ********************** FUNCTIONS *********************************

function handleGeneralIntent(generalResponse, context) {
    //console.log('in the handle phone intent function');
     var options = {};
         options.speechText = generalResponse;
         options.readText = generalResponse;
         options.repromptText = "Ask me another question from your mailer or say, goodbye, to end this session.";
         options.endSession = false;
         options.attributes = theQuestionArray;
         options.campaignName = campaignName;
         options.campaignNumber = campaignNumber;
         options.smsMessage = smsMessage;
        
         context.succeed(buildResponse(options));

     }

function startDiscussion(callback) {
    theFoundResponse = "We did not find that offer. Please tell me the offer number on your mailer.";
    for(var x=0;x<theQuestionArray.length;x++){
        //console.log('length of array:', theQuestionArray.length);
        if(theQuestionArray[x].userResponse.S == "Offer"){
            //if(theQuestionArray[x].userResponse.S == "Offer" || theQuestionArray[x].userResponse.S == "offer"){
            //theFoundResponse = theQuestionArray[x].assistantResponse.S;
            theFoundResponse = theQuestionArray[x].answerFromAlexa.S;
            //console.log('FOUND IT! ',theFoundResponse);
            } // if "Offer"

            if(theQuestionArray[x].userResponse.S == "smsMessage"){
                //theFoundResponse = theQuestionArray[x].assistantResponse.S;
                smsMessage = theQuestionArray[x].answerFromAlexa.S;
                //console.log('FOUND IT! ',theFoundResponse);
                //console.log('THE SMS MESSAGE: ',smsMessage);
                } 
        } // end for loop
        
    // theQuestionArray.sort(function(a, b){return a.id.S - b.id.S});
    // theFoundResponse = theQuestionArray[0].answerFromAlexa;
    // smsMessage = theQuestionArray[1].answerFromAlexa;

        callback(theFoundResponse, smsMessage)
}

function handlePhoneIntent(options, stuff,callback) {
    console.log('in the handle phone intent function with: ',stuff);
     var options = {};
         options.speechText = stuff;
         options.readText = options.speechText;
         options.repromptText = "You will receive your text shortly. Ask me another question from your mailer or say, goodbye, to end this session.";
         options.endSession = false;
         options.searchResults = "none";
         //options.campaignName = already defined coming in
         // options. campaignNumber = already defined coming in
         callback(options)

     }

function sortResult(searchResults, callback){
        if(searchResults.length>0){
        searchResults.sort(function(a, b){
        var dateA=new Date(a.startTime), dateB=new Date(b.endTime);
        return dateA-dateB });
        //console.log('at sort and found ',searchResults.length);
        }
        callback(searchResults);
}

function buildResponse(options) {
        
    var response = {
        version: "1.0",
        sessionAttributes: {
            //campaignName: options.campaignName,
            campaignName: options.campaignName,
            campaignNumber: options.campaignNumber,
            smsMessage : options.smsMessage,
            //searchResults: options.attributes,
            searchResults: null,
            //textList: options.textList
        },
        response: {
            outputSpeech: {
                type: "SSML",
                ssml: "<speak>" + options.speechText + "</speak>"
                },

        card: {
            type: "Standard",
            title: "This Offer",
            text: options.readText
        },
        shouldEndSession: options.endSession,
        }
    };

    if (options.repromptText) {
        response.response.reprompt = {
            outputSpeech: {
                type: "PlainText",
                text: options.repromptText
            }
        };
    }

    if(options.session && options.session.attributes){
        response.sessionAttributes = options.session.attributes;
    }
    return response;
}


function handleLaunchRequest(context) {
    let options = {};
    options.speechText = "Hi there. Thanks for checking out This Offer. What is your offer number? Your number is listed on the mailing.";
    options.readText = "Hi there. Thanks for checking out This Offer. What is your offer number? You can find the name of your offer number listed on your mailing.";
    options.repromptText = "Just tell me your offer number. It is listed on your mailing.";
    options.endSession = false;
    options.attributes = [];
    options.campaignName = "none";
    options.campaignNumber = null;
    context.succeed(buildResponse(options));
}

function handleBadCampaignRequest(context) {
    let options = {};
    options.speechText = "I don't recognize that campaign name. What is your offer number? You can find the name of your offer number listed on your mailing.";
    options.readText = "I don't recognize that campaign name. What is your offer number? You can find the name of your offer number listed on your mailing.";
    options.repromptText = "Just tell me your offer number. It is listed on your mailing.";
    options.endSession = false;
    options.attributes = [];
    context.succeed(buildResponse(options));
}

function handleStopIntent(context){
            let options = {};
                options.speechText = "Goodbye";
                options.readText = options.speechText;
                options.repromptText = "";
                options.endSession = true;
                options.attributes = [];
                options.campaignName = "none";
                options.campaignNumber = "none";
                context.succeed(buildResponse(options));
}

function handleHelpIntent(options, context){
    //let options = {};
        options.speechText = "You can ask me any question on your mailer. Just say, what's included, to start. Or, say, goodbye, to end this session.";
        options.readText = options.speechText;
        options.repromptText = "Try saying, what's included. Or, say, goodbye, to end this session.";
        options.endSession = false;
        options.attributes = theQuestionArray;
        options.campaignName = campaignName;
        
        if(campaignNumber){
            options.campaignNumber = campaignNumber;
        }
        
        options.smsMessage = smsMessage;
        context.succeed(buildResponse(options));
}



function handleEndIntent(context){
    
            let options = {};
                options.speechText = "Catch you later";
                options.readText = options.speechText;
                options.repromptText = "";
                options.endSession = true;
                options.attributes = [];
                context.succeed(buildResponse(options));
}

// **********************************************************************
function handleHelloIntent(request, context) {
    let options = {};
    options.speechText = "Hey there! Tell me your campaign number on the mailing.";
    options.readText = "Hey there! Tell me your campaign number on the mailing.";
    options.repromptText = "Still there? Tell me your campaign number on the mailing.";
    options.endSession = false;
    options.attributes = [];
    options.campaignName = "none";
    options.campaignNumber = "none";
    context.succeed(buildResponse(options));
}


function handleGeneralRequestIntent(session, request, context) {
    var bestPosition = 0;
    let options = {};
    var goodResponse = "";

    //console.log('at fn handleGeneralRequestIntent with: ', session.attributes.searchResults[0]);
    //if(request.intent.slots.Item.value){
    if(saveItem){
        var item = saveItem;
        item = item.toLowerCase();

        //console.log('in handle general request intent with item: ',item);
        tryVariations(session, item, (foundResult, responseResults)=>{
            //console.log('after THAT try Variations with: ', foundResult,responseResults);

        if (foundResult.length == ""){

            saveIntent = "Item Not Found in Library";
            saveItem = item;

            //analytics(stationId, deviceId, saveIntent, saveItem, (stuff)=>{
                //theRandomIntro = Math.floor((Math.random() * 6));
                options.speechText = "Not sure what you said there. Just say, help, for assistance.";
                options.readText = "Not sure what you said there. Just say, help, for assistance.";
                //options.speechText = "I’m sorry, I wasn’t given anything for "+item +", but I would be happy to learn it for your event. <break time=\"0.75s\"/> You can ask me a question like, " + helperPhrase[theRandomIntro];
                options.repromptText = "Ask me another question or say stop to end this session. Say, I want to share, to give us your thoughts about this event. Say, help, for assistance.";
                options.endSession = false;
                options.attributes = ", but there's nothing to repeat right now. Ask me another another question or say stop to end this session.";
                context.succeed(buildResponse(options));
                //});
            } else {

                saveIntent = "GeneralIntent";
                saveItem = item;
    
                //analytics(stationId, deviceId, saveIntent, saveItem, (stuff)=>{
                    //theRandomIntro = Math.floor((Math.random() * 6));
                    options.speechText = responseResults[0] + "Ask me another or question to keep going. ";
                    options.readText = responseResults[0] + "Ask me another or question to keep going. ";
                    //options.speechText = "I’m sorry, I wasn’t given anything for "+item +", but I would be happy to learn it for your event. <break time=\"0.75s\"/> You can ask me a question like, " + helperPhrase[theRandomIntro];
                    options.repromptText = responseResults[0] + "Ask me another question, or say, help, if you need assistance. Say, goodbye to end this session.";
                    options.endSession = false;
                    options.attributes = session.attributes.searchResults;
                    context.succeed(buildResponse(options));
               
            } // else
        }) //  try variations

} else {

    options.speechText = "Oh no. I don't have an answer for that one. Ask me another question or say stop to end this session. You can say, help for assistance.";
    options.readText = "Oh no. I don't have an answer for that one. Ask me another question or say \"Stop\" to end this session.";
    options.repromptText = "Ask me another question or say stop to end this session. Say, I want to share, to give us your thoughts about this event. You can say, help, for assistance.";

    options.endSession = false;
    options.attributes = [];
    saveIntent = "Item Not Found No Library";
    saveItem = "No item presented"
    //analytics(stationId, deviceId, saveIntent, saveItem, (stuff)=>{
        context.succeed(buildResponse(options));
    //})

}

} // end fn handle General

// All questions / answers live in single DynamoDB
// Just need to filter out by Campaign Number!

function findQandA(saveItem, callback){
    //console.log('at findQandA with campaign number: ',saveItem);
    // Reset theQuestionArray so that we are loading a new campaign
    theQuestionArray = [];

    params = {
        //FilterExpression: "campaign = :theCampaign",
        FilterExpression: "campaignNumber = :theCampaign",
        ExpressionAttributeValues: {
            ":theCampaign" : {S: saveItem}  
        },
        TableName: "admr_questions",
        };

        // SCAN DynamoDB
        ddb.scan(params, function (err, data){
            if (err) {
              console.log("Dynamo Error", err);
              //callback(theQuestionArray)

            } else {
              data.Items.forEach(function (element, index, array){
              theQuestionArray.push(element);
              }) // forEach scan

              callback(theQuestionArray)

            } // else

          }) // ddb.scan       
} // End findQ&A function


function handleNumberIntent(theFoundResponse, context) {
    let options = {};
    //console.log('at fn handleNumber Intent with THE RESPONSE: ', theFoundResponse);
    if(theFoundResponse){
        options.speechText = theFoundResponse;
        options.readText = theFoundResponse;
        options.repromptText = theFoundResponse;
        options.endSession = false;
        options.attributes = theQuestionArray;
        options.campaignName = campaignName;
        options.campaignNumber = campaignNumber;
        options.smsMessage = smsMessage;
        //saveIntent = "Number Intent";
        //saveItem = "Initial response";


    //analytics(stationId, deviceId, saveIntent, saveItem, (stuff)=>{
        context.succeed(buildResponse(options));
    //})

    } else { // Did not find any results
        options.speechText = "We didn't find that campaign. Try another number.";
        options.repromptText = "We didn't find that campaign. Try another number.";
        options.endSession = false;
        options.attributes = theQuestionArray;
        options.campaignName = campaignName;
        options.campaignNumber = campaignNumber;
        saveIntent = "Item Not Found No Library";
        saveItem = "No item presented"
    //analytics(stationId, deviceId, saveIntent, saveItem, (stuff)=>{
        context.succeed(buildResponse(options));
    //})


    }
        

}


function handleAPIIntent(theFoundResponse, context) {
    // Analytics and send the response
  //analytics(saveIntent, saveItem, (stuff)=>{
    //console.log('all done with analytics ... ');

    if(theType == "numberIntent"){
        context.succeed({
            theCampaignNumber : theId,
            theCampaignName: campaignName,
            theItemPhrase: theFoundResponse,
            theTypeOfCall: theType,
            // Only send the SMS Message if we are in a text intent
            theSMSMessage : smsMessage
            }) // end context.succeed
        
    } else {
    context.succeed({
        theCampaignNumber : theId,
        theCampaignName: campaignName,
        theItemPhrase: theFoundResponse,
        theTypeOfCall: theType
        }) // end context.succeed
    }
      //});
        

}



function bestMatch(saveItem,searchResults,callback){
    //var theBestMatch = null;
    //console.log('in best match with:', saveItem, searchResults);
    var matches = stringSimilarity.findBestMatch(saveItem, searchResults);

    // if(matches.bestMatch.rating >= .6){
    //     //console.log('found one');
    //     //theBestMatch = matches.bestMatch.target;
    //     //console.log('target: ', theBestMatch);
    // } else {
    //     //console.log('not found');
    //     //theBestMatch = "I don't have an answer to that question. Try another question the list ... "
    // }

    //console.log(matches);
    callback(matches);
}

// *********************************************************************
function analytics(saveIntent, saveItem, callback){
    
    // Create uniqueID and Date to save in DynamoDB
    var newTime = new Date();
    var timeId = newTime.getTime();
    var theRandom = String(Math.floor((Math.random() * 9999)));
    var uniqueId = timeId + theRandom;
    //var theDate = new Date();
    var theDate = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    theDate = theDate.toString();

    // For SMS Analytics

    // Create object to save in DynamoDB
    // Rename Table for this when upload to ADMR instance
    var params = {
        TableName: 'admr_analytics2',  // for admr
        //TableName: 'admr_analytics', // For cavoom
        Item: {
          'analyticsId' : {S: uniqueId},
          'the_Date' : {S: theDate},
          'the_Intent' : {S: saveIntent},
          'the_Item' : {S: saveItem},
          'the_Source' : {S: "Google Action"},
          'the_Campaign' : {S: campaignName},
          'the_Session_id' : {S: theSessionId},
          'the_UserId' : {S: theUserId},
          'phone_number' : {S: theNumber},
          'reporting' : {S: "production"}
        }
      };

      ddb.putItem(params, function(err, data) {
        if (err) {
          console.log("Error", err);
          callback(err)
        } else {
          console.log("Success", data);
          callback(data)
        }

      })

      //callback('muted for test')

}


function createArrays(theQuestionArray, callback){
    //console.log('sessionAttributes.searchResults0:',session.attributes.searchResults[0]);
    //console.log('at create Arrays')
    
    var i=0;
    var searchResults = [];
    var responseResults = [];
    var theSearch = "";
    var theResponse = "";

    //console.log('length of attributes: ', session.attributes.searchResults.length);

    while (i < theQuestionArray.length){
            //console.log(i);
            // Changed these to not worry about case
            theSearch = theQuestionArray[i].userResponse.S;
            theResponse = theQuestionArray[i].answerFromAlexa.S;

            // theSearch = theQuestionArray[i].userResponse.S.toLowerCase();
            // theResponse = theQuestionArray[i].answerFromAlexa.S.toLowerCase();

            searchResults.push(theSearch);
            responseResults.push(theResponse);
        i++;
        }
    
        callback(searchResults, responseResults)
}


function tryVariations_OLD(session, item, callback){
    //console.log('At fn try Variations with item:', item);
    //console.log('sessionAttributes.searchResults0:',session.attributes.searchResults[0]);
    var i=0;
    var j=0;
    var theResult = "";
    var searchResults = [];
    var responseResults = [];
    var itemResults = [];
    var theSearch = "";
    var theGoodResponse = "";
    var theId = null;
    var theItem = null;
    var parameters = null;
    var uniques = [];
    

        while (i < session.attributes.searchResults.length){
            //console.log('i',i);
            theSearch = session.attributes.searchResults[i].userResponse.S.toLowerCase();
            //theGoodResponse = session.attributes.searchResults[i].assistantResponse.S.toLowerCase();
            theGoodResponse = session.attributes.searchResults[i].answerFromAlexa.S.toLowerCase();

            if(theSearch.includes(item)){
                //console.log('found one: ', theSearch)
                searchResults.push(theSearch);
                responseResults.push(theGoodResponse);

            } else {
                // Need to establish empty results???
            }
        i++;
        }
    callback(searchResults, responseResults)
}


function buildResponseDelegate(options, session) {

    var response = {
        "version":"1.0",
        "sessionAttributes": {
            //campaignName: options.campaignName,
            campaignName: options.campaignNumber,
            campaignNumber: options.campaignNumber,
            smsMessage : options.smsMessage,
            //searchResults: options.attributes,
            searchResults: null,
            //textList: options.textList
        },
        "response": {
            "directives": [
                {
                    "type":"Dialog.Delegate",

                }
            ],
            "shouldEndSession":false
        }

    //     "sessionAttributes": {
    //         //searchResults: session.attributes.searchResults,
    // }



    }

    return response;
}


function confirmResponseDelegate(options, theNumber, session){
    // place spaces between each digit for a better readback experience
    theNumber = theNumber.split('').join(' ');

    var response = {
        "version": "1.0",
        "sessionAttributes": {
            //campaignName: options.campaignName,
            campaignName: options.campaignNumber,
            campaignNumber: options.campaignNumber,
            smsMessage: options.smsMessage,
            searchResults: null,
            //textList: options.textList
        },
        "response": {
          "outputSpeech": {
            "type": "PlainText",
            "text": "You said, " + theNumber + ", is that correct?"
          },
          "shouldEndSession": false,
          "directives": [
            {
              "type": "Dialog.ConfirmSlot",
              "slotToConfirm": "phoneSlot",
    
            }
          ]
        }
      }
      return(response)
    }

// Send the Text Message
    function sendTheText(theNumber, theMessage,callback){

        var options = {
            headers: { 'Authorization': 'Bearer 3dcd6cf5e0124f66af726cd13870464c' ,
          "Content-Type": "application/json"}
          };
          var numberToSend = theNumber;
          var MessageToSend = theMessage;
          
          // This is the message to send after number registered
          var thePost = {
            "Body" : MessageToSend,
            "To" : [numberToSend]
          };
          
          // This is the first call to register the nuumber
            var theFirstPost = {
              'MobileNumber' : numberToSend
            };

        // First call to register the number - OLD - POCKETSTOP - NOT USING
         needle.post(urlSubscribe, theFirstPost, options, function(err, resp) {
                if(!err){
                //console.log('body: ', resp.body);
                //console.log('code: ', resp.statusCode)
                } else {
                  //console.log(err);
                  //console.log('code: ', resp.statusCode)
                  callback('We could not send your text message. Please try again.')
        
                };
        
                // Second call to send the message
                needle.post(url, thePost, options, function(err, resp) {
        
                  if(!err){
                    //console.log('body: ', resp.body);
                    //console.log('code: ', resp.statusCode);
                    callback('Your text message will arrive shortly. Ask me another question or say, stop, to end this session.')
                  
                    } else {
                      console.log(err);
                      callback('We could not send your text message. Please try again.')
                    }
          });
        });
        }

        function sendThatText(theNumber,theMessage,callback){
            console.log('sending: ', theNumber,theMessage);
            var convertedNum = theNumber.replace(/\D/g,'');
            //var convertedNum = parseInt(theNumber); // gets rid of non numerical characters
            //convertedNum = convertedNum.toString(); // converts back to string for character count
            //console.log('CONVERTED: ', convertedNum,convertedNum.length);
            if(convertedNum.length >=10 && convertedNum.length < 12){
                console.log('Number provided is the RIGHT SIZE');
 
            client.messages
          .create({
             body: theMessage,
             from: fromNumber,
             //mediaUrl: ['https://c1.staticflickr.com/3/2899/14341091933_1e92e62d12_b.jpg'],
             to: convertedNum
           })
          .then(message => callback('Your message has been sent. Ask me another question from your mailer or say, stop, to end this session.'));
          //.then(message => callback(message.status));
        } else {
            callback('Please say, text me, to try another number.')
        }
          
        }
