'use strict';

/**
 * @ngdoc overview
 * @name dodisMapApp
 * @description
 * # dodisMapApp
 *
 * Main module of the application.
 */
angular
  .module('dodisMapApp', [
    'ngAnimate',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
