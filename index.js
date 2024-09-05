"use strict";
/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("Canvas");
const ctx = canvas.getContext("2d");
let rectangles = new Map();
const rectSize = 20;
let isDragging = false;
let dragIndex = -1;
let dragOffsetX = 0;
let dragOffsetY = 0;
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;
let reconnectTime = 2500;
let totalSent = 0;
let totalReceived = 0;
let conStatus;
let stale;
let currId = 0;
let moved = false;

// Create WebSocket connection.
let ws = createWS();

function createWS() {
    let ws;
    try {
        ws = new WebSocket("ws://localhost:8080/ws");
    } catch (error) {
        console.log("Websocket connection failed");
    }

    /* function reconnect() {
          ws = new WebSocket("ws://localhost:8080/ws");
      } */

    ws.onopen = (event) => {
        //socket.send("Hello Server!");
        /*  if (rectangles.length > 0 && stale) {
                 let data = JSON.stringify(rectangles);
                 ws.send(data);
                 const bytes = new TextEncoder().encode(data).length;
                 totalSent += bytes;
             } */
    };

    ws.onerror = (event) => {
        console.log("error", event);
        //setTimeout(createWS, reconnectTime);
    };

    ws.onclose = (event) => {
        console.log("closing", event);
        //setTimeout(createWS, reconnectTime);
    };

    // Listen for messages
    ws.onmessage = (event) => {
        if (event.data === "Hello from Go Server!") {
            console.log("Received hello");
        } else {
            let data = JSON.parse(event.data);

            const bytes = new TextEncoder().encode(data).length;
            totalReceived += bytes;

            //console log the size of the data
            //console.log("Message from server ", bytes, [data]);
            //data = JSON.parse(data);
            //rectangles = data;

            console.log("received", data.type);
            //TODO update client state based on server msg
            switch (data.type) {
                case "add":
                    console.log(data);
                    rectangles.set(data.rect.id, data.rect);
                    console.log(rectangles);
                    break;
                case "move":
                    console.log(data);
                    rectangles.set(data.rect.id, data.rect);
                    console.log(rectangles);
                    break;
                case "del":
                    console.log(data);
                    rectangles.set(data.rect.id, data.rect);
                    console.log(rectangles);
                    break;
                case "clear":
                    console.log(data);
                    rectangles = new Map();
                    console.log(rectangles);
                    break;
            }
        }
    };

    return ws;
}

class Rectangle {
    constructor(x, y, color, id) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.color = color;
    }
}

class Msg {
    constructor(type, rect) {
        this.type = type;
        this.rect = rect;
    }
}

function isPointInside(x, y, rect) {
    return (
        x >= rect.x - rectSize / 2 &&
        x <= rect.x + rectSize / 2 &&
        y >= rect.y - rectSize / 2 &&
        y <= rect.y + rectSize / 2
    );
}

function draw(rect) {
    ctx.fillStyle = rect.color;
    ctx.beginPath();
    ctx.roundRect(
        rect.x - rectSize / 2,
        rect.y - rectSize / 2,
        rectSize,
        rectSize,
        rectSize / 5,
    );
    ctx.fill();
}

function drawRectangles() {
    const currentTime = performance.now();
    frameCount++;

    if (frameCount % 100 === 0) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw rectangles
    if (rectangles.size > 0) {
        rectangles.values().forEach((rect) => draw(rect));
    }
    switch (ws.readyState) {
        case WebSocket.CONNECTING:
            conStatus = "Connecting...";
            break;
        case WebSocket.OPEN:
            conStatus = "Online";
            break;
        case WebSocket.CLOSED:
            conStatus = "Offline";
            break;
    }

    // Draw FPS counter
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`FPS: ${fps}`, 10, 30);
    ctx.fillText(`Bytes sent: ${totalSent}`, 10, 50);
    ctx.fillText(`Bytes received: ${totalReceived}`, 10, 70);
    ctx.fillText(`Connection status: ${conStatus}`, 10, 90);

    // Request the next animation frame
    window.requestAnimationFrame(drawRectangles);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

const randomHsl = () => `hsla(${Math.random() * 360}, 100%, 50%, 1)`;

function addRectangle(x, y) {
    let uuid = crypto.randomUUID();
    // console.log(uuid);
    let currRect = new Rectangle(x, y, randomHsl(), uuid);
    rectangles.set(uuid, currRect);
    dragIndex = currRect.id;
    isDragging = true;

    let data = JSON.stringify(new Msg("add", currRect));
    ws.send(data);
    console.log("sent add");
    //TODO add byte tracking here
}

function removeRectangle(x, y) {
    let recttoremove = rectangles
        .values()
        .find((rect) => isPointInside(x, y, rect));
    /* console.log(isPointInside(x, y, recttoremove));
      console.log(recttoremove); */
    if (recttoremove) {
        rectangles.delete(recttoremove.id);
    }
    //todo send del here
    let data = JSON.stringify(new Msg("del", recttoremove));
    ws.send(data);
    console.log("sent del");
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    };
}

canvas.addEventListener("mousedown", function(e) {
    const pos = getMousePos(e);
    if (e.button === 0) {
        // Left click
        /* for (let i = rectangles.length - 1; i >= 0; i--) {
                if (isPointInside(pos.x, pos.y, rectangles[i])) {
                    isDragging = true;
                    dragIndex = i;
                    dragOffsetX = pos.x - rectangles[i].x;
                    dragOffsetY = pos.y - rectangles[i].y;
                    return;
                }
            } */
        let recttodrag = rectangles
            .values()
            .find((rect) => isPointInside(pos.x, pos.y, rect));

        // console.log("here", recttodrag);
        if (recttodrag) {
            // console.log("here", recttodrag);
            isDragging = true;
            dragIndex = recttodrag.id;
            moved = false;
            dragOffsetX = pos.x - recttodrag.x;
            dragOffsetY = pos.y - recttodrag.y;
            return;
        }
        addRectangle(pos.x, pos.y);
    } else if (e.button === 2) {
        // Right click
        removeRectangle(pos.x, pos.y);
    }
});

canvas.addEventListener("mousemove", function(e) {
    if (isDragging) {
        moved = true;
        const pos = getMousePos(e);
        rectangles.get(dragIndex).x = pos.x - dragOffsetX;
        rectangles.get(dragIndex).y = pos.y - dragOffsetY;
    }
});

canvas.addEventListener("mouseup", function() {
    if (isDragging && moved) {
        //send the rect to the server that was dragged using msg type "move"
        let data = JSON.stringify(new Msg("move", rectangles.get(dragIndex)));
        ws.send(data);
        console.log("sent move");
    }

    isDragging = false;
    dragIndex = -1;
    moved = false;

    let data = rectangles;
    //send a message to the server with the current state
    //console.log(ws.readyState == WebSocket.OPEN);
    /* if (ws.readyState === WebSocket.OPEN) {
          stale = false;
          ws.send(data);
          const bytes = new TextEncoder().encode(data).length;
          totalSent += bytes;
      } else if (ws.readyState === WebSocket.CLOSED) {
          stale = true;
          console.log("websocket not working gonna try to reconnect");
          ws = createWS();
      } */
});

document.addEventListener("keydown", function(e) {
    if (e.key === "r" || e.key == "R") {
        isDragging = false;
        dragIndex = -1;
        rectangles = new Map();
        //send a message to the server with the current state
        /* let data = JSON.stringify(rectangles);
        ws.send(data); */
        const bytes = new TextEncoder().encode(data).length;
        totalSent += bytes;


        /* let data = JSON.stringify(new Msg("clear"));
        ws.send(data); */
        console.log("sent clear");
    }
});

canvas.addEventListener("contextmenu", function(e) {
    e.preventDefault();
});

canvas.style.backgroundColor = "#414141";
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.border = "0";
document.body.style.overflow = "hidden";

resizeCanvas();
drawRectangles();
window.addEventListener("resize", resizeCanvas);
