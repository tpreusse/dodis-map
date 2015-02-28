'use strict';

angular.module('dodisMapApp').directive('time', function() {
  return {
    restrict: 'A',
    scope: {
      data: '=timeData',
      extent: '=timeExtent',
      width: '=',
      height: '='
    },
    link: function($scope, $element) {
      var container = d3.select($element[0]).classed('time-series', 1);

      var x = d3.time.scale();
      var y = d3.scale.linear();

      var line = d3.svg.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });
      var safeLine = function(d, i) {
        return line(d, i) || 'M0,0';
      };

      var allLine = container.append('path').attr('class', 'all line');
      // var activeLine = container.append('path').attr('class', 'active line');

      var brush = d3.svg.brush()
        .x(x)
        .on('brush', function() {
          $scope.$apply(function() {
            $scope.extent = brush.empty() ? null : brush.extent();
          });
        });

      var brushGroup = container.append('g')
        .attr('class', 'x brush');

      var xAxis = d3.svg.axis().scale(x).orient('bottom');

      var xAxisGroup = container.append('g')
        .attr('transform', 'translate(0, 85)')
        .attr('class', 'x axis');

      function render() {
        var data = $scope.data;
        if(!data) {
          return;
        }

        x
          .range([0, $scope.width])
          .domain(d3.extent(data, function(d) { return d.x; }));
        y
          .range([$scope.height, 0])
          .domain(d3.extent(data, function(d) { return d.y; }));


        brushGroup
          .call(brush);
        brushGroup.selectAll('rect')
          .attr('y', -6)
          .attr('height', $scope.height + 12);

        xAxisGroup.call(xAxis);
        xAxisGroup.select('text').remove();

        allLine
          .datum(data)
          .attr("d", safeLine);

        // activeLine
        //   .datum(data.filter(function(d) {
        //     return d.x <= $scope.active;
        //   }))
        //   .attr("d", safeLine);
      }
      $scope.$watchCollection('data', render);
      $scope.$watch('active', render);
    }
  };
});
