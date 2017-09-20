"use strict";

var soap = require('strong-soap').soap;
//var parseString = require('xml2js').parseString;
// wsdl of the web service this client is going to invoke. For local wsdl you can use, url = './wsdls/stockquote.wsdl'
var url = 'http://103.244.7.218:10080/24online/services/UserManagementService?WSDL';
var _ = require('lodash');
var finalObjArray = [];
var options = {};
soap.createClient(url, options, function(err, client) {
    var method = client['UserManagementService']['UserManagementService']['getActiveUsers'];
    method({
        "in0": {
            "IPAddress": "103.244.7.218",
            "password ": "administrator",
            "userName": "administrator"
        },
        "in1": 1,
        "in2": 10
    }, function(err, result, envelope, soapHeader) {
  //  console.log(result.getActiveUsersReturn.getActiveUsersReturn);
        var finalObj = _.omit(result.getActiveUsersReturn.getActiveUsersReturn, '$attributes');
       // console.log(finalObj);
        _.forEach(result.getActiveUsersReturn.getActiveUsersReturn, (value) => {
            // console.log(_.omit(value,'$attributes'));

            var tempObj = {};
            for (var key in _.omit(value, '$attributes')) {
                if (_.has(value[key], '$value')) {
                    tempObj[key] = value[key]['$value'];
                }
            }
            finalObjArray.push(tempObj);
        });
        console.log('========================================');
        console.log(finalObjArray);
    });
});