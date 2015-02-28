'use strict';

angular.module('dodisMapApp').directive('globe', function($http, $location) {
  var globalInstanceIndex = 0;

  return {
    restrict: 'A',
    scope: {
      features: '=',
      countries: '=',
      mousePos: '=?',
      radiusScale: '='
    },
    link: function($scope, $element) {
      var globe = !!Number($location.search().globe);

      var instanceIndex = globalInstanceIndex;
      globalInstanceIndex++;

      var initialScale = 268;
      var minScale = 268, maxScale = 2000;
      var initialRotation = [90.7, -46.6, 0];
      var rotationSpeed = 0.3;

      var width = 915;
      var height = 610;


      var λ = d3.scale.linear().range([-180, 180]);
      var φ = d3.scale.linear().range([90, -90]);

      var projection;
      if(globe) {
        projection = d3.geo.orthographic()
          .scale(initialScale)
          .rotate(initialRotation)
          .precision(0.5)
          .clipAngle(90)
          .translate([(width / 2), (height / 2)]);
      }
      else {
        projection = d3.geo.projection(d3.geo.hammer.raw(1.75, 2)) // Briesemeister (almost)
          .rotate([-15, -40])
          .center([23, 0])
          .scale(230)
          .translate([(width / 2) - 10, (height / 2) + 15]);
      }

      var path = d3.geo.path()
        .projection(projection)
        .pointRadius(1);
      var safePath = function(d, i) { return path(d, i) || 'M0,0'; };
      var projectionWithClip;
      (function() {
        var o, listener = {
          point: function(x, y) {
            o = [x, y];
          }
        };
        projectionWithClip = function(i) {
          o = undefined;
          projection.stream(listener).point(i[0], i[1]);
          return o;
        };
      })();

      var root = d3.select($element[0]).classed('globe', 1);

      var defs = d3.select($(root.node()).closest('svg').find('defs')[0]);
      var pattern = defs.append('pattern')
        .attr('id', 'no-data-pattern-'+instanceIndex)
        .attr('patternTransform', 'rotate(45)scale(4)')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', '1')
        .attr('height', '1');
      pattern
        .append('rect')
          .style('fill', '#eee')
          .attr('width', '1')
          .attr('height', '1');
      pattern
        .append('rect')
          .style('fill', '#ccc')
          .attr('width', '0.05')
          .attr('height', '1');

      function moveAnglesByPx(rotation, scale, dx, dy) {
          var p = [
            λ.invert(rotation[0]) + dx/(scale/initialScale),
            φ.invert(rotation[1]) + dy/(scale/initialScale)
          ];
          return [λ(p[0]), φ(p[1]), 0];
      }

      function rotateProjectionBy(dx, dy) {
        projection.rotate(moveAnglesByPx(
          projection.rotate(),
          projection.scale(),
          dx, dy
        ));
      }

      var zoom;
      if(globe) {
        var drag = d3.behavior.drag()
          .on("drag", function() {
            rotateProjectionBy(d3.event.dx * rotationSpeed, d3.event.dy * rotationSpeed);
            render();
         });

        zoom = d3.behavior.zoom()
          .on("zoom", function() {
            var s = projection.scale() * d3.event.scale;
            // enfore max & min scale
            s = Math.min(Math.max(s, minScale), maxScale);

            projection.scale(s);
            zoom.scale(1);
            render();
          });

        root
          .call(drag)
          .call(zoom);
      }
      else {
        zoom = d3.behavior.zoom()
          .translate([0, 0])
          .scale(1)
          .scaleExtent([1, 6])
          .on("zoom", function() {
            // enfore keeping the map in viewport
            var translate = d3.event.translate, scale = d3.event.scale;
            translate[0] = Math.min(0, translate[0]);
            translate[1] = Math.min(0, translate[1]);
            translate[0] = Math.max(translate[0], ((width * scale) - width) * -1);
            translate[1] = Math.max(translate[1], ((height * scale) - height) * -1);
            zoom.translate(translate);

            container.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
            countries.style("stroke-width", 1 / scale + "px");
            if(features) {
              features.attr('r', featureRadius(scale));
            }
          });

        var overlay = root.append('rect')
          .classed('overlay', 1)
          .attr('width', width)
          .attr('height', height);
        
        overlay
          .call(zoom);
      }

      var container = root.append('g');

      container.on(Modernizr.touch ? 'touchmove' : 'mousemove', function() {
        $scope.$apply(function() {
          $scope.mousePos = d3.mouse(root.node());
        });
      });


      λ.domain([0, width]);
      φ.domain([0, height]);

      if(globe) {
        var sphere = container.append('path')
          .datum({type: 'Sphere'})
          .attr('class', 'sphere');
      }

      var clipAllRect = container.append('clipPath')
        .attr('id', 'clip-all-'+instanceIndex)
        .append('rect')
          .attr('class', 'clip-all-rect');

      root
        .attr('clip-path', 'url(#clip-all-'+instanceIndex+')');

      // should watch width / height
      clipAllRect
        .attr('width', width)
        .attr('height', height);



      var countries;
      var countryContainer = container.append('g').classed('country', 1);
      if(!globe) {
        countryContainer
          .call(zoom);
      }

      $http.get('data/geo/world-110m-w-iso_a2.json').success(function(json) {
        $scope.countries = topojson.feature(json, json.objects.countries).features.filter(function(f) { return f.id !== 10; });

        countries = countryContainer.selectAll('path')
          .data($scope.countries);
        var newCountries = countries.enter().append('path');
        countries.exit().remove();

        newCountries.on(Modernizr.touch ? 'touchstart' : 'mouseover', function(d) {
          $scope.$apply(function() {
            $scope.mousePos = d3.mouse(root.node());
            $scope.countries.forEach(function(d) {
              d.hovered = undefined;
            });
            d.hovered = true;
          });
          if(Modernizr.touch) {
            d3.event.preventDefault();
            $(document).one('touchend', function() {
              $scope.$apply(function() {
                d.hovered = undefined;
              });
            });
          }
        });
        if(!Modernizr.touch) {
          newCountries.on('mouseleave', function(d) {
            $scope.$apply(function() {
              d.hovered = undefined;
            });
          });
        }

        countries
          .attr('d', safePath);

        renderActive();
        render();
      });

      function renderActive() {
        if(countries) {
          countries
            .style('fill', function(d) {
              return d.active ? null : ''; // url(#no-data-pattern-'+instanceIndex+')
            })
            .classed('is-active', function(d) {
              return d.active;
            })
            .classed('is-hovered', function(d) {
              return d.hovered;
            });
        }
      }
      $scope.$watch(
        function() { return ($scope.countries || []).map(function(d) { return [d.active, d.hovered]; }).join(); },
        renderActive
      );

      var features;
      var featureContainer = container.append('g').classed('features', 1);


      function featureRadius(scale) {
        var radiusScale = $scope.radiusScale;
        return function(f) {
          return radiusScale(f.properties.occurrences || 0) / scale;
        };
      }

      $scope.$watch(function() {
        return ($scope.features || []).map(function(f) {
          return f.properties.occurrences;
        }).join(',');
      }, function() {
        if(!$scope.features) {
          return;
        }

        features = featureContainer.selectAll('circle')
          .data($scope.features, function(f) { return f.geometry.coordinates.join(','); });
        var scale = zoom.scale();
        features.enter().append('circle').attr('r', featureRadius(scale));
        features.exit().remove();

        render();

        features.transition().duration(300).attr('r', featureRadius(scale));
      });

      function render() {
        if(features) {
          $scope.features.forEach(function(f) {
            if(globe) {
              f.pos = projectionWithClip(f.geometry.coordinates);
              if(!f.pos) {
                f.pos = [-50, -50];
              }
            }
            else {
              f.pos = f.pos || projection(f.geometry.coordinates);
            }
          });
          
          features
            .attr('cx', function(d) { return d.pos[0]; })
            .attr('cy', function(d) { return d.pos[1]; });
        }
        if(globe) {
          sphere
            .attr('d', safePath);
          if(countries) {
            countries
              .attr('d', safePath);
          }
        }
      }

      render();


    }
  };
});