// var soap = require('soap');
// var url = ' http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL';
// var args = { name: 'value' };
// soap.createClient(url, function(err, client) {
//     client.MyFunction(args, function(err, result) {
//         console.log(result);
//     });
// });

"use strict";

var soap = require('strong-soap').soap;
// wsdl of the web service this client is going to invoke. For local wsdl you can use, url = './wsdls/stockquote.wsdl'
var url = 'http://www.webservicex.net/stockquote.asmx?WSDL';

var requestArgs = {
  symbol: 'IBM'
};

var options = {};
soap.createClient(url, options, function(err, client) {
  var method = client['StockQuote']['StockQuoteSoap']['GetQuote'];
  method(requestArgs, function(err, result, envelope, soapHeader) {
    //response envelope
    console.log('Response Envelope: \n' + envelope);
    //'result' is the response body
    console.log('Result: \n' + JSON.stringify(result));
  });
});