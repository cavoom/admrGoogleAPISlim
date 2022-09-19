var testIt = require('./numbers.json');
var campaignNumber = "1";

if(testIt[0][campaignNumber]){

    console.log(testIt[0][campaignNumber]);
    console.log(testIt[1][campaignNumber]);
} else {
    console.log('Sorry. We did not find that campaign number. Please try again.')
}