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
