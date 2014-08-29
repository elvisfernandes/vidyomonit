/*
# -*- coding: utf-8 -*-
##
##
## This file is part of the CERN Dashboards and Monitoring for Vidyo
## Copyright (C) 2014 European Organization for Nuclear Research (CERN)
##
## CERN Dashboards and Monitoring for Vidyo is free software: you can redistribute it and/or
## modify it under the terms of the GNU General Public License as
## published by the Free Software Foundation, either version 3 of the
## License, or (at your option) any later version.
##
## CERN Dashboards and Monitoring for Vidyo is distributed in the hope that it will be useful, but
## WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
## GNU General Public License for more details.
##
## You should have received a copy of the GNU General Public License
## along with the CERN Dashboards and Monitoring for Vidyo software.  If not, see <http://www.gnu.org/licenses/>.

# Breaking down attribute moves in d3 to fit in requestAnimationFrame.
*/

/* global requestAnimationFrame */
'use strict';

/**
 * Breaking down attribute moves in d3 to fit in requestAnimationFrame.
 * This makes animation smoother when dealing with lots of nodes.
 *
 * Source: https://gist.github.com/DavidBruant/6489486
 */
var moveItems = (function(){
    var todoNode = 0;
    var todoLink = 0;
    var MAX_NODES = 100;
    var MAX_LINKS = MAX_NODES/2;
    var restart = false;
    var node, link, width, height;

    function moveSomeNodes(){
        var n;
        var goal = Math.min(todoNode+MAX_NODES, node[0].length);

        for(var i=todoNode ; i < goal ; i++) {
            n = node[0][i];

            var translate = 'translate(' + boundedX(n.__data__.x) + ',' + boundedY(n.__data__.y) + ')';
            n.setAttribute('transform', translate);
        }

        todoNode = goal;
        requestAnimationFrame(moveSome);
    }

    function moveSomeLinks(){
        var l;
        var goal = Math.min(todoLink+MAX_LINKS, link[0].length);

        for(var i=todoLink ; i < goal ; i++){

            l = link[0][i];
            if (!l) continue;

            l.setAttribute('x1', boundedX(l.__data__.source.x));
            l.setAttribute('y1', boundedY(l.__data__.source.y));
            l.setAttribute('x2', boundedX(l.__data__.target.x));
            l.setAttribute('y2', boundedY(l.__data__.target.y));
        }

        todoLink = goal;
        requestAnimationFrame(moveSome);
    }

    function moveSome(){
        if(todoNode < node[0].length) // some more nodes to do
            moveSomeNodes();
        else{ // nodes are done
            if(todoLink < link[0].length) // some more links to do
                moveSomeLinks();
            else{ // both nodes and links are done
                if(restart){
                    restart = false;
                    todoNode = 0;
                    todoLink = 0;
                    requestAnimationFrame(moveSome);
                }
            }
        }
    }

    function boundedX(x, r) {
        r = r || 10;
        return Math.max(r, (Math.min(x, width - r)));
    }

    function boundedY(y, r) {
        r = r || 10;
        return Math.max(r, (Math.min(y, height - r)));
    }

    return function moveItems(newNode, newLink, newWidth, newHeight){
        node = newNode;
        link = newLink;
        width = newWidth;
        height = newHeight;

        if(!restart){
            restart = true;
            requestAnimationFrame(moveSome);
        }
    };
})();
