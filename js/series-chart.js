(function() {
this.d3c = _.extend(this.d3c || {}, {seriesCharts: seriesCharts});
function seriesCharts() {
    return {
        __init__: function() {
            _.extend(this, d3c.common());
            return this;
        },

        withSeriesData: function(dataSource) {
            var it = _.clone(dataSource);
            var notifyListeners = observable(it);
            dataSource.onUpdate(function(update) {
                var seriesData = update.categories.map(function(category) {
                    return {
                        category: category,
                        values: update.data.map(function(d) {
                            var row = {};
                            row[update.key] = d[update.key];
                            row["value"] = d[category];
                            return row;
                        })
                    };
                });
                notifyListeners(extendCopyOf(update, {seriesData: seriesData}));
            });
            it.sendUpdate = function() {
                dataSource.sendUpdate();
            };
            return it;
        },

        newLineSeries: function(root, xScale, yScale, uiConfig, idPostfix) {
            idPostfix = (idPostfix === undefined ? "" : "-" + idPostfix);

            var interpolation = "basis";
            var lastUpdate;
            var series;

            root.append("defs").append("clipPath").attr("id", "clip" + idPostfix)
                .append("rect").attr("width", uiConfig.width).attr("height", uiConfig.height).attr("x", 1);
            var line = createLine(xScale, yScale, interpolation);

            var it = {};
            var notifyListeners = observable(it);
            it.update = function(update) {
                lastUpdate = update;

                root.selectAll(".series" + idPostfix).remove();

                series = root.selectAll(".series" + idPostfix)
                    .data(update.seriesData)
                    .enter().append("g")
                    .attr("class", "series" + idPostfix);

                line = createLine(xScale, yScale, interpolation);
                uiConfig.color.domain(_.pluck(update.seriesData, "category"));

                series.append("path")
                    .attr("class", "line")
                    .attr("d", function(d){ return line(d.values); })
                    .attr("clip-path", "url(#clip" + idPostfix + ")")
                    .attr("id", function(d){ return d.category; })
                    .style("stroke", function(d){ return uiConfig.color(d.category); });

                notifyListeners();
            };
            it.setInterpolation = function(value) {
                interpolation = value;
                it.update(lastUpdate);
            };
            it.setSelectedCategory = function(category) {
                if (category !== null) {
                    series.sort(function(a, b) {
                        if (a.category === category) return 1;
                        else if (b.category === category) return -1;
                        else return 0;
                    });
                    series.selectAll("path")
                        .style("stroke-width", function(it) { return it.category == category ? "3px" : ""; })
                        .style("opacity", function(it) { return it.category == category ? "1" : "0.7"; });
                } else {
                    series.selectAll("path").style("stroke-width", "").style("opacity", 1);
                }
            };
            it.setCategoryVisible = function(category, isVisible) {
                var opacity = isVisible ? null : "none";
                root.selectAll("[id=\"" + category + "\"]").style("display", opacity);
            };
            it.onXScaleUpdate = function(updatedXScale) {
                xScale = updatedXScale;
                root.selectAll(".series" + idPostfix).data(lastUpdate.data).selectAll("path")
                    .attr("d", function(d){ return line(d.values); });
            };
            return it;

            function createLine(xScale, yScale, interpolation) {
                return d3.svg.line()
                    .interpolate(interpolation)
                    .x(function(d) { return xScale.getAndApply(d); })
                    .y(function(d) { return yScale.getAndApply(d); });
            }
        },

        newCategoriesPanel: function(root, lineSeries, dataSource, labelText) {
            var hiddenCategories = [];

            var wordPanel = root.append("span");
            wordPanel.append("label").html(labelText);
            var wordsSpan = wordPanel.append("span");
            wordPanel.append("button").text("Reset").on("click", function() {
                dataSource.clearCategoryExclusions();
            });

            var it = {};
            it.update = function(update) {
                wordsSpan.selectAll(".word").remove();

                var word = wordsSpan.selectAll(".word")
                    .data(update.seriesData).enter()
                    .append("span")
                    .attr("class", "word");

                word.on("mouseover", function(d) {
                    lineSeries.setSelectedCategory(d.category);
                });
                word.on("mouseout", function() {
                    lineSeries.setSelectedCategory(null);
                });

                word.append("input").attr("type", "checkbox")
                    .attr("checked", function(it) { return _.contains(hiddenCategories, it.category) ? null : ""; })
                    .on("click", function(it) {
                        if (d3.event.altKey) {
                            dataSource.excludeCategory(it.category);
                        } else {
                            var visible = this.checked;
                            lineSeries.setCategoryVisible(it.category, visible);
                            if (visible) {
                                hiddenCategories = _.without(hiddenCategories, it.category);
                            } else {
                                hiddenCategories.push(it.category);
                            }
                        }
                    });
                word.append("label").html(function(d){ return "&nbsp;" + d.category; });
            };
            it.onLineSeriesUpdate = function() {
                hiddenCategories.forEach(function(it) {
                    lineSeries.setCategoryVisible(it, false);
                });
            };
            return it;
        }

}.__init__();
}
}());