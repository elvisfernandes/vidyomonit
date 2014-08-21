/* global d3, moveItems, requestAnimationFrame, images_path, gotoNetworkElement */
'use strict';


var TopologyGraph = function(parentElement, authToken) {

    var dragging = false;
    var lastUpdate = null;
    var enabled = false;
    var nodeClickTimeout;  // Used to separate clicks from double clicks

    var width = $(parentElement).width(),
        height = $(parentElement).height();

    var links = [];
    var nodes = [];
    var conferences = {};

    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .linkDistance(40)
        .gravity(0.4)
        .charge(-400)
        .size([width, height])
        .friction(0.5)
        .on('tick', tick);

    var spinner = d3.select(parentElement).append('img')
        .attr('alt', 'spinner')
        .attr('src', images_path + '/spinner.gif')
        .attr('id', 'spinner');

    var svg = d3.select(parentElement).append('svg')
        .attr('width', width)
        .attr('height', height);

    svg.append('g').attr('class', 'links');
    svg.append('g').attr('class', 'nodes');

    var link = svg.selectAll('.links .link'),
        node = svg.selectAll('.nodes .node'),
        circle = svg.selectAll('.nodes circle');


    // Load graph, set refresh interval
    init(true);

    setInterval(function() {
        var parent = $(parentElement);
        var visible = parent.css('visibility') == 'visible' && parent[0].offsetParent;
        var timeElapsed = lastUpdate ? new Date() - lastUpdate > 5000 : true;
        if (visible && enabled && timeElapsed && !dragging && tabIsActive()) {
            init();
        }
    }, 1000);


    /**
     * Fetch data, init graph.
     */
    function init(initialUpdate) {
        startLoading();

        var url = 'https://vidyodash.cern.ch/ajax/active_conferences/';
        var data = authToken ? {token: authToken} : null;
        $.ajax({
            url: url,
            data: data,
            dataType: 'jsonp',
            success: function(data) {
                parseData(data, initialUpdate);
                update(initialUpdate);
                stopLoading();

                lastUpdate = new Date();
            }
        });
    }

    var findNode = function(id, specificNodes) {
        specificNodes = specificNodes || nodes;
        for (var i = 0; i < specificNodes.length; i++) {
            if (specificNodes[i].id === id)
                return specificNodes[i];
        }
    };

    function pushNode(node, oldNodes) {
        if (oldNodes.length > 0) {
            var oldNode = findNode(node.id, oldNodes);
            if (!oldNode) {
                oldNode = findNode(node.parentId, oldNodes);
            }
            if (oldNode) {
                node.x = oldNode.x;
                node.y = oldNode.y;
                node.px = oldNode.px;
                node.py = oldNode.py;
                node.fixed = oldNode.id == node.id;
            }
        }
        return nodes.push(node);
    }

    function parseData(data, initialUpdate) {
        var oldNodes = initialUpdate ? [] : nodes.slice();

        for (var key in conferences) {
            delete conferences[key];
        }

        nodes.splice(0);
        links.splice(0);

        var nodeLookup = {};
        var portal = {
            type: 'portal',
            id: 'portal'
        };
        pushNode(portal, oldNodes, initialUpdate);

        // First get routers and gateways
        for (var i in data) {
            var call = data[i];

            if (!(call.RouterID in nodeLookup)) {
                var router = {
                    type: 'router',
                    id: call.RouterID,
                    hostname: call.RouterHostname,
                    label: call.RouterLabel,
                    ip: call.RouterIP,
                    users: 0
                };
                var routerIndex = pushNode(router, oldNodes);
                links.push({
                    source: portal,
                    target: router
                });
                nodeLookup[call.RouterID] = routerIndex - 1;
            }

            if (call.GWID && !(call.GWID in nodeLookup)) {
                var gateway = {
                    type: 'gateway',
                    id: call.GWID,
                    hostname: call.GatewayHostname,
                    label: call.GatewayLabel,
                    ip: call.GatewayIP,
                    users: 0
                };
                var gwIndex = pushNode(gateway, oldNodes, initialUpdate);
                nodeLookup[call.GWID] = gwIndex - 1;
            }
        }

        // Then get client calls
        for (var j in data) {
            var client = data[j];
            if (!client.RouterID) continue;

            var newNode = {
                type: 'client',
                id: client.CallID,
                name: client.CallerName || '',
                conferenceName: client.ConferenceName || '',
                conferenceId: client.UniqueCallID,
                routerId: client.RouterID,
                parentId: client.GWID || client.RouterID,
                joinTime: client.JoinTime
            };

            pushNode(newNode, oldNodes, initialUpdate);

            var parentRouter = findNode(client.RouterID);
            parentRouter.users += 1;
            var target = parentRouter;

            if (client.GWID) {
                var parentGateway = findNode(client.GWID);
                parentGateway.users += 1;

                links.push({
                    source: parentGateway,
                    target: parentRouter
                });

                target = parentGateway;
            }

            links.push({
                source: newNode,
                target: target
            });

            if (!(client.UniqueCallID in conferences)) {
                conferences[client.UniqueCallID] = [];
            }

            var ids = [client.CallID, client.RouterID, client.GWID];
            ids.forEach(function(id) {
                if (id && conferences[client.UniqueCallID].indexOf(id) < 0) {
                    conferences[client.UniqueCallID].push(id);
                }
            });
        }
    }


    var update = function(initialUpdate) {
        force.stop();

        link = svg.select('.links').selectAll('.link').data(links, function(d) { return d.source.id + "-" + d.target.id; });
        link.enter().append('line').attr('class', 'link');
        link.exit().remove();

        node = svg.select('.nodes').selectAll('.node').data(nodes, function(d) { return d.id; });

        var drag = force.drag()
            .on('dragstart', onDragStart)
            .on('dragend', onDragEnd);

        var nodeEnter = node.enter().append('g')
            .attr('class', function(d) { return 'node ' + d.type; })
            .on('dblclick', onDblClick)
            .call(drag);


        var circleEnter = nodeEnter.append('circle');

        circleEnter
            .style('fill', color)
            .style('fill-opacity', function(d) { return d.type == 'client' ? 0.6 : 0.8; })
            .style('stroke', 'gray')
            .attr('r', nodeRadius)
            .on('mouseover', onMouseOver)
            .on('mouseout', onMouseOut)
            .on('click', onNodeClick);

        if (authToken) {
            circleEnter.append('svg:title')
                .text(function(d) {
                    var name = nodeName(d);
                    if (d.type == 'client') {
                        name = name + '\n' + d.conferenceName + '\nJoined: ' + d.joinTime;
                    }
                    return name;
                });
        }

        if (!initialUpdate) {
            circleEnter.each(function(d) {
                if (d.type == 'client') notifyNewCall(d);
            });
        }

        nodeEnter.append('text')
            .attr('class', 'usercount')
            .attr('dy', function(d) { return d.type == 'portal' ? '0.2em' : '0.4em'; });

        nodeEnter.append('text')
            .attr('class', 'label');

        nodeEnter.filter(function(d) { return d.type == 'portal'; })
            .append('text')
            .attr('class', 'minilabel')
            .attr('dy', '1.4em')
            .text('users connected');

        node.select('.label')
            .text(nodeLabel);

        node.select('.usercount')
            .text(function(d) {
                if (d.type == 'portal') {
                    return nodes.filter(function(d) { return d.type == 'client'; }).length || 0;
                }
                return d.users || '';
            });

        var nodeExit = node.exit();

        nodeExit.select('text').remove();

        nodeExit.select('circle')
            .transition().duration(600)
            .attr('r', 20)
            .style('fill', 'red')
            .transition().duration(1000)
            .attr("r", 0);

        nodeExit.transition().delay(1600).remove();

        // Scale force by the number of ndodes
        var k = Math.sqrt(node[0].length / (width * height));

        force
            .chargeDistance(1000)
            .charge(function(d) { return d.type == 'client' ? -25000 * k : -2200000 * k; })
            .gravity(100 * k);

        force.start();

        if (initialUpdate) {
            for (var i in d3.range(10000)) {
                force.tick();
            }
            force.stop();
            node.each(function(d) {
                d.fixed = true;
            });
        }

        node.select('.label')
            .attr('dy', function(d) {
                if (d.y > height - 60) {
                    return '-1.4em';
                }
                return d.type == 'portal' ? '4.8em' : '1.8em';
            });

        circle = node.selectAll('circle');
    };


    function tick() {
        moveItems(node, link, width, height);
    }

    function onDragStart(d) {
        dragging = true;
        node.each(function(n) {
            if (n.parentId == d.id) {
                n.fixed = false;
            }
        });
    }

    function onDragEnd(d) {
        dragging = false;
        d.fixed = true;
        lastUpdate = new Date();
    }

    function onDblClick(d) {
        clearTimeout(nodeClickTimeout);
        node.each(function(n) {
            if (n.id == d.id || n.parentId == d.id) {
                n.fixed = false;
            }
        });
    }

    function onMouseOver(target) {
        if (target.type === 'client') {
            highlightConf(target.conferenceId);
        }
    }

    function onMouseOut(target) {
        if (target.type !== 'client') return;
        stopHighlightingConf(target.conferenceId);
    }

    function onNodeClick(target) {
        clearTimeout(nodeClickTimeout);
        if (!d3.event.defaultPrevented && target.ip ) {
            nodeClickTimeout = setTimeout(function(){
                gotoNetworkElement(target.ip);
            }, 500);
        }
    }

    var typeColors = {
        portal: '#4B81E1',
        gateway: '#B2D5D8',
        router: '#4292C6',
        client: '#fe9929'
    };

    var shortTypes = {
        portal: 'P',
        router: 'R',
        gateway: 'GW',
        client: 'C'
    };


    var nodeRadiuses = {
        portal: 50,
        router: 12,
        gateway: 12,
        client: 9
    };

    function color(d) {
        return typeColors[d.type || 'client'];
    }

    function shortenedType(type) {
        return shortTypes[type];
    }

    function nodeLabel(d) {
        var label = '';
        if (d.type == 'portal') {
            label = 'VidyoPortal';
        }
        else if (d.type !== 'client') {
            label = nodeName(d);
        }
        return label;
    }

    function nodeName(d) {
        return d.name || d.label || d.hostname || d.ip || shortenedType(d.type);
    }

    function nodeRadius(d) {
        return nodeRadiuses[d.type] || 9;
    }

    function highlightConf(confId) {
        requestAnimationFrame(function() {
            var nodesToHighlight = conferences[confId];
            circle
                .filter(function(d) {
                    return nodesToHighlight.indexOf(d.id) > -1;
                })
                .style('stroke', 'black')
                .style('fill-opacity', 1);

            link
                .filter(function(d) {
                    return nodesToHighlight.indexOf(d.target.id) > -1 && (
                        d.source.type == 'portal' ||
                            nodesToHighlight.indexOf(d.source.id) > -1
                    );
                })
                .style('stroke', '#09DD00')
                .style('stroke-opacity', '1');
        });
    }

    function stopHighlightingConf() {
        requestAnimationFrame(function() {
            circle
                .style('stroke', 'gray')
                .style('fill-opacity', function(d) { return d.type == 'client' ? 0.6 : 0.8; });

            link
                .style('stroke', '#9ecae1')
                .style('stroke-opacity', '0.8');
        });
    }

    function startLoading() {
        spinner.style('visibility', 'visible');
    }

    function stopLoading() {
        spinner.style('visibility', 'hidden');
    }

    function notifyNewCall(d) {
        node.filter(function(p) { return d.parentId == p.id; })
            .select('circle')
            .transition().duration(600)
            .attr('r', 20)
            .style('fill', 'green')
            .transition().duration(1000)
            .attr("r", nodeRadius)
            .style('fill', color);
    }

    function tabIsActive() {
        var keys = ['hidden', 'webkitHidden', 'mozHidden', 'msHidden'];

        for (var i in keys) {
            if (keys[i] in document) {
                return !document[keys[i]];
            }
        }

        return true;
    }

    return {
        start: function() { force.start(); enabled = true; },
        stop: function() { force.stop(); enabled = false; },
        isEnabled: function() { return enabled; }
    };
};
