var express = require('express'),
  app = express(),
  port = 8123,
  bodyParser = require('body-parser');

const dateTime = require('node-datetime');
const marklogic = require('marklogic');
var connInfo = require('./db_config.js');
var db = marklogic.createDatabaseClient(connInfo);
const qb = marklogic.queryBuilder;
const pb = marklogic.patchBuilder;

var dbInit = require('./load_db.js');
var allen = require('./allen.js');

app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', dbInit);
app.use('/allen', allen);

var routes = require('./routes/dummyRoutes');
routes(app);

//=============================== INLINE API ================================

app.get("/treatment/latest", function(request, response) {
        db.documents.query(
        qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
                function(documents) {
                        console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
                        var data = JSON.stringify(documents, null, 3);
                        response.render(
                           'treatment1',
                           { title: 'Latest Treatments', data: data}
                        );
                }
        );
});

app.get("/treatment/all", function(request, response) {
        db.documents.query(
        qb.where(qb.collection('treatment')).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
                function(documents) {
                        console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
                        var data = JSON.stringify(documents, null, 3);
                        response.render(
                           'treatment2',
                           { title: 'All Treatments', data: data}
                        );
                }
        );
});

app.post("/treatment/insert", function(request, response) {
    var patientID = request.body.patient_id;
    var doctorID = request.body.doctor_id;
    var disease = request.body.disease;
    var room = request.body.room;
    var validStart = request.body.valid_start;
    var validEnd = request.body.valid_end;

    var valid_start = new Date(dateTime.create(validStart).getTime()).toISOString();
    var valid_end = new Date(dateTime.create(validEnd).getTime()).toISOString();

    var uri = "/" + patientID + "_" + doctorID + "_" + room + "_" + disease;
    var treatment = { 
        uri: uri,
        temporalCollection: 'treatment',
        content: {
            "treatment" : {
                "patient_id": patientID,
                "doctor_id": doctorID,
                "room": room,
                "disease": disease
            }
        },
        metadataValues: {
            validStart: valid_start,
            validEnd: valid_end
        }
    };
    db.documents.write(treatment).result(  
      function(result) {
        console.log(result);
        console.log("Inserted object : \n" + JSON.stringify(treatment, null, 3));
        response.status(200).redirect("/treatment/all");
      }, 
      function(error) {
        console.log(JSON.stringify(error, null, 2));
      }
    );
});

app.get("/treatment/update/list", function(request, response) {
    db.documents.query(
        qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
        function(documents) {
            console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
            var data = JSON.stringify(documents, null, 3);
            response.render(
               'update_list',
               { title: 'List of Updatable Treatments', data: data}
            );
        }
    );
});

app.get("/treatment/update/form", function(request, response) {
    var uri = request.param("uri");
    db.documents.read({uris: uri, categories: ['content', 'collections', 'metadata-values']}).result(
        function(documents) {
            var record = documents[0];
            var data = JSON.stringify(record, null, 3);
            console.log("Data : " + data);
            response.render(
               'update_form',
               { title: 'Update a Record', data: data}
            );
        }
    );
});

app.post("/treatment/update", function(request, response) {
    console.log('Get new POST request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var uri =  request.body.uri;
    var patientID = request.body.patient_id;
    var doctorID = request.body.doctor_id;
    var disease = request.body.disease;
    var room = request.body.room;
    var validStart = request.body.valid_start;
    var validEnd = request.body.valid_end;

    db.documents.read({uris: uri, categories:['content', 'metadata-values']}).result(
        function(documents) {
            var treatmentRecord = documents[0];
            console.log("\nTreatment to update : " + JSON.stringify(treatmentRecord, null, 3));
            treatmentRecord.temporalCollection = "treatment";
            treatmentRecord.content.treatment.patient_id = patientID;
            treatmentRecord.content.treatment.doctor_id = doctorID;
            treatmentRecord.content.treatment.disease = disease;
            treatmentRecord.content.treatment.room = room;
            treatmentRecord.metadataValues.validStart = validStart;
            treatmentRecord.metadataValues.validEnd = validEnd;
            db.documents.write(treatmentRecord).result(
                function(result) {
                    console.log("Update result : " + JSON.stringify(result, null, 3));
                    console.log("\nSuccessfully updated document with uri : " + uri);
                    response.status(200).redirect("/treatment/all");
                        //response.status(200).send("OK");
                },
                function(error) {
                    console.log(JSON.stringify(error, null, 2));
                }
            );
        },function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    )
});

app.get("/treatment/delete", function(request, response) {
    response.render(
       'delete',
       { title: 'Delete a Record'}
    );
});


//========================== END INLINE API ================================
app.listen(port);

console.log('todo list RESTful API server started on: ' + port);
