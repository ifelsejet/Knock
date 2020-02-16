var APP_ID = 'amzn1.ask.skill.066dde67-de79-4f7f-bb86-c7912d67e0d3';

/* Include skill, Alexa responses, and DB logic files */
var AlexaSkill = require('./AlexaSkill.js');
var Responses = require('./responses.js');
var Database = require('./database.js');

var database = new Database()

var AskIntent = {
  INIT: 1,
  RECOGNIZE: 2,
  NO_RECOGNIZE: 3,
};

var knock = function (){
    AlexaSkill.call(this, APP_ID);
}

knock.prototype = Object.create(AlexaSkill.prototype);
knock.prototype.constructor = knock;

knock.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session){
    console.log("Knock onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: "+ session.sessionId);
};


knock.prototype.eventHandlers.onLaunch = function (launchRequest, session, response){
    console.log("knock onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);

    initiatePiFacialRecognition(session, response, function(name){
        if(name == "noRecognize"){
            setNoRecognizeIntent(session)
            var speechResponse = Responses.failRecognize()
            response.ask(speechResponse.speechOutput, speechResponse.repromptText)
        }
        else if(name == "noPerson"){
            response.tell(Responses.PIRRepromptText)
        }
        else{
            setRecognizeIntent(session)
            setSessionName(session,name)
            var speechResponse = Responses.launchRecognized(name)
            response.ask(speechResponse.speechOutput, speechResponse.repromptText)
        }
    });
};

knock.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session){
    console.log("Knock onSessionEnded requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
}

/* All of the intents or voice interactions handled here */
knock.prototype.intentHandlers = {
    "DoorIntent": function(intent, session, response){
        initiatePiFacialRecognition(session, response, function(name){
            if(name == "noRecognize"){
                setNoRecognizeIntent(session)
                var speechResponse = Responses.failRecognize()
                response.ask(speechResponse.speechOutput, speechResponse.repromptText)
            }
            else if(name == "noPerson"){
                response.tell(Responses.PIRRepromptText)
            }
            else{
                setRecognizeIntent(session)
                setSessionName(session,name)
                var speechResponse = Responses.launchRecognized(name)
                response.ask(speechResponse.speechOutput, speechResponse.repromptText)
            }
        });
    },
    /* When a user answers a yes/no question with yes this intent is triggered */
    "AMAZON.YesIntent": function(intent, session, response){
        switch(session.attributes.AskIntentStatus) {                                                          //Different logic executed based on if person at door is recognized or not
            case AskIntent.RECOGNIZE:
                initiatePiFacialTraining(session, response, function(status){                                 //If recognized, facial training process occurs
                    if(status == "Success"){
                        var speechResponse = Responses.finishTrainIntent(session.attributes.NameRecognition)  //Response on success of facial training
                        response.tell(speechResponse.speechOutput)
                    }
                    else{
                        response.tell(Responses.noTrainText);                                                  //Response on failed facial training
                    }
                });
                break
            case AskIntent.NO_RECOGNIZE:                                                    //If user not recognized, asks for user's name to train them
                var speechResponse = Responses.setNameIntent()
                response.ask(speechResponse.speechOutput, speechResponse.repromptText)
                break
            default:
                console.log("ERROR: Unable to determine yes response")
                response.tell(Responses.exitText);
                break
        }
    },
    /* This intent allows user to set the name of the unknown person proceeded
       by training person with given name */
    "SetNameIntent": function(intent, session, response){
        var name = intent.slots.UserFirstName.value;                                    //Value of user spoken name input
        trainUnknownPerson(session, response, name, function(status){                   //Train person's face with given name
            if(status == "Success"){
                var speechResponse = Responses.finishTrainIntent(name)
                response.tell(speechResponse.speechOutput)
            }
            else{
                response.tell(Responses.noTrainText);
            }
        });
    },
    "AMAZON.NoIntent": function (intent, session, response) {
        response.tell(Responses.exitText);
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        response.tell(Responses.exitText);
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        response.tell(Responses.exitText);
    }

};

function setRecognizeIntent(session){
    session.attributes.AskIntentStatus = AskIntent.RECOGNIZE
}

function setNoRecognizeIntent(session){
    session.attributes.AskIntentStatus = AskIntent.NO_RECOGNIZE
}

function setSessionName(session, name){
    session.attributes.NameRecognition = name;
}

/* Initiates facial recognition that is handled on the Raspberry Pi */
function initiatePiFacialRecognition(session, response, piCallback){
    database.writeDatabase(function(name){
        piCallback(name);
    });
}

/* Initiates facial training that is handled on the Raspberry Pi */
function initiatePiFacialTraining(session, response, piCallback){
    database.trainFaceCall(session.attributes.NameRecognition,function(status){
        piCallback(status);
    });
}

/* Initiates facial training of unknown person that is handled on the Raspberry Pi */
function trainUnknownPerson(session, response, name, piCallback){
    database.trainFaceCall(name, function(status){
        piCallback(status);
    });
}

// Lambda function:
exports.handler = function (event, context) {
    var knock = new knock();
    knock.execute(event,context);
};
