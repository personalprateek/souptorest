var soap = require('strong-soap').soap;
var _ = require('lodash');
var parseString = require('xml2js').parseString
//var url = 'https://www.w3schools.com/xml/tempconvert.asmx?wsdl';
var url = 'http://103.244.7.218:10080/24online/services/UserManagementService?wsdl';
//var cipher.getAuthTag() = "Basic " + new Buffer('administrator' + ':' + 'gipl@59$').toString("base64");
soap.createClient(url, function(err, client) {
    // console.log(client);
    //client.setSecurity(new soap.WSSecurity('administrator', 'gipl@59$'));
    //console.log(JSON.stringify(client.describe().UserManagementService.UserManagementService.getActiveUsers));
    // client.addHttpHeader('Authentication', auth);
    console.log(client.describe().UserManagementService.UserManagementService);
    client.getActiveUsers({
        "in0": {
            "IPAddress": "103.244.7.218",
            "password ": "administrator",
            "userName": "administrator"
        },
        "in1": 0,
        "in2": 0
    }, (err, result, envelope) => {

        console.log('Response Envelope: \n' + envelope);
        //'result' is the response body
        console.log('Result: \n' + JSON.stringify(result));
        // var xml2js = require('xml2js');
        // var parser = new xml2js.Parser({ explicitArray: false, trim: true });
        // parser.parseString(body, (err, result) => {
        //     console.log('JSON result', result);
        // });
        //console.log('last request: ', result);
    });

    // client.sayHello(null, (err, result, body) => {
    //     console.log(result.sayHelloReturn.$value);

    // })
    // _.forOwn(client.describe(), (cfg, key) => {
    //     console.log(cfg);
    // });
    // client.getSets(args, function(err, result) {
    //     if (err) {console.log(err)};
    //     if (!result) {
    //         //return getRandomSet();
    //         throw null;
    //     }
    //     var sets = result.getSetsResult.sets;
    //     console.log(sets);
    // });
});
// soap.createClient(url, function(err, client) {
//     console.log(client.lastRequest);
//     client.getSets(args, function(err, result) {
//         console.log( result);
//     });
// });