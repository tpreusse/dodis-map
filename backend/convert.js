var mysql = require('mysql');
var q = require('q');
var _ = require('lodash');
var d3 = require('d3');
var fs = require('fs');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'dodis-hackathon'
});

function promiseResult(query) {
  var defer = q.defer();

  connection.query(query, function(err, rows, fields) {
    if(err) {
      defer.reject(err);
    }
    else {
      defer.resolve(rows);
    }
  });

  return defer.promise;
}

function documents() {
  console.log('documents');
  q.all(
    [
      'SELECT ' +
        '`d`.`id`, `d`.`doc_date`, `d`.`title`, ' +
        '`date`.`date_begin`, `date`.`timepoint_begin` FROM document `d`' +
      ' LEFT JOIN `date_dodis` `date` ON `d`.`date_id` = `date`.`id`',
      'SELECT * FROM document_has_place'
    ].map(promiseResult)
  ).then(function(results) {
    console.log('results');

    var documents = results[0];
    var documentsPlaces = results[1];

    documents.forEach(function(aDocument) {
      aDocument.summary = undefined; // 11MB

      var connections = _.where(documentsPlaces, {document_id: aDocument.id});
      aDocument.places = connections.map(function(connection) {
        return connection.document_place_relationship_type + ':' + connection.place_id;
      }).join(',');
    });

    fs.writeFileSync('documents.tsv', d3.tsv.format(documents));
  }, function(errors) {
    console.log('errors');
    console.log(errors);
  });
}

function places() {
  console.log('places');
  q.all(
    [
      'SELECT * FROM place',
      'SELECT * FROM place_i18n'
    ].map(promiseResult)
  ).then(function(results) {
    console.log('results');

    var places = results[0];
    var placesTranslations = results[1];

    _.each(places, function(place) {
      var translations = _.where(placesTranslations, {place_id: place.id});

      place.name_de = (_.findWhere(translations, {lang_code: 'de'}) || {}).name;
      place.name_fr = (_.findWhere(translations, {lang_code: 'fr'}) || {}).name;
      place.synonymous = translations.filter(function(translation) {
        return !_.contains(['de', 'fr'], translation.lang_code);
      }).map(function(translation) {
        return translation.name;
      }).join(', ');
    });

    fs.writeFileSync('places.tsv', d3.tsv.format(places));
  }, function(errors) {
    console.log('errors');
    console.log(errors);
  });
}

connection.connect(function(err) {
  if(err) throw err;
  console.log('connect');
  documents();
  places();
  connection.end();
});

// connection.connect(function(err) {
//   if(err) throw err;

//   var queries = [
//     'SELECT * FROM documents',
//     'SELECT * FROM document_has_place'
//   ];
//   var query = connection.query('SELECT * FROM documents', function(err, rows, fields) {
//     if(err) throw err;
//     // Neat!
//   });
// });
