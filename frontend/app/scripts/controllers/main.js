'use strict';

/**
 * @ngdoc function
 * @name dodisMapApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the dodisMapApp
 */
angular.module('dodisMapApp')
  .controller('MainCtrl', function ($scope, $http, $q) {

    $scope.radiusScale = d3.scale.sqrt().range([1, 10]);

    var docDateFormat = d3.time.format("%-d.%-m.%Y");
    var mysqlDateFormat = d3.time.format("%Y-%m-%d");

    $q.all([
      $http.get('data/documents.tsv'),
      $http.get('data/places.tsv')
    ]).then(function(responses) {
      $scope.places = d3.tsv.parse(responses[1].data);
      $scope.placeIndex = _.indexBy($scope.places, 'id');
      $scope.documents = d3.tsv.parse(responses[0].data, function(doc) {
        if(doc.places) {
          doc.places = doc.places.split(',').map(function(place) {
            return place.split(':');
          });
        }
        else {
          doc.places = [];
        }
        var date = docDateFormat.parse(doc.doc_date);
        if(!date) {
          date = mysqlDateFormat.parse(doc.date_begin);
        }
        if(!date) {
          date = mysqlDateFormat.parse(doc.timepoint_begin);
        }
        doc.date = date;
        return doc;
      });

      $scope.extent = d3.extent($scope.documents, function(d) {
        return d.date;
      });

      var timeSeries = [];
      var timeSeriesFormat = d3.time.format('%Y');
      var timeSeriesIndex = {};
      d3.time.years(
        d3.time.year.floor($scope.extent[0]),
        d3.time.year.ceil($scope.extent[1])
      ).forEach(function(year) {
        var o = {x: year, y: 0};
        timeSeries.push(o);
        timeSeriesIndex[timeSeriesFormat(year)] = o;
      });
      $scope.documents.forEach(function(doc) {
        if(doc.date) {
          timeSeriesIndex[timeSeriesFormat(doc.date)].y++;
        }
      });
      $scope.timeSeries = timeSeries;

      countPlacesInDocuments($scope.documents, 'counts');
      $scope.radiusScale.domain([1, d3.max($scope.places, function(p) {
        return (p.counts.total || 0);
      })]);
    });

    var numberFormat = d3.format(',');
    $scope.numberFormat = function(n) {
      return numberFormat(n).replace(',', "'");
    };
    $scope.dateFormat = d3.time.format("%d.%m.%Y");

    var types = ['destination', 'origin', 'mention'];
    var typeOverwrites = {'destination_of_copy': 'destination'};

    function countPlacesInDocuments(documents, key) {
      var placeIndex = $scope.placeIndex;

      $scope.places.forEach(function(place) {
        place[key] = {
          total: 0
        };
        types.forEach(function(type) {
          place[key][type] = 0;
        });
      });
      documents.forEach(function(doc) {
        doc.places.forEach(function(placeConnection) {
          var type = placeConnection[0];
          if(typeOverwrites[type]) {
            type = typeOverwrites[type];
          }
          var place = placeIndex[placeConnection[1]];
          place[key].total++;
          place[key][type]++;
        });
      });
    }

    $scope.filtered = [];
    $scope.$watchGroup(['documents', 'places', 'filterExtent'], function() {
      if(!$scope.places || !$scope.documents) {
        return;
      }

      var documents = $scope.documents;
      var filterExtent = $scope.filterExtent;
      if(filterExtent) {
        documents = documents.filter(function(doc) {
          return doc.date >= filterExtent[0] && doc.date <= filterExtent[1];
        });
      }
      $scope.filteredDocuments = documents;
      $scope.displayLimit = 20;

      countPlacesInDocuments(documents, 'filteredCounts');

      var filtered = $scope.filtered = [];
      $scope.places.forEach(function(place) {
        if(!place.filteredCounts.total) {
          return;
        }
        filtered.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            // https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Geographical_coordinates#Precision_guidelines
            coordinates: [d3.round(place.longitude, 3), d3.round(place.latitude, 3)]
          },
          properties: {
            occurrences: place.filteredCounts.total
          }
        });
      });

    });
  });
