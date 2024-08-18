"use strict";
/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('Canvas');
const ctx = canvas.getContext('2d');
let rectangles = [];
const rectSize = 20;
let isDragging = false;
let dragIndex = -1;
let dragOffsetX = 0;
let dragOffsetY = 0;
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

// Create WebSocket connection.
const socket = new WebSocket("wss://localhost:8080/ws");

// Connection opened
socket.addEventListener("open", (event) => {
    //socket.send("Hello Server!");
});

// Listen for messages
socket.addEventListener("message", (event) => {
    if (event.data === "Hello from Go Server!") {
        console.log("Received hello");
    } else {
        data = JSON.parse(event.data);
        console.log("Message from server ", data);
        rectangles = data;
    }
});

class Rectangle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
    }
}

function isPointInside(x, y, rect) {
    return (x >= rect.x - rectSize / 2 && x <= rect.x + rectSize / 2 &&
        y >= rect.y - rectSize / 2 && y <= rect.y + rectSize / 2);
}

function draw(rect) {
    ctx.fillStyle = rect.color;
    ctx.beginPath();
    ctx.roundRect(rect.x - rectSize / 2, rect.y - rectSize / 2, rectSize, rectSize, rectSize / 5);
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
    if (rectangles.length > 0) {
        rectangles.forEach(rect => draw(rect));
    }

    // Draw FPS counter
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`FPS: ${fps}`, 10, 30);

    // Request the next animation frame
    window.requestAnimationFrame(drawRectangles);
}


function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

const randomHsl = () => `hsla(${Math.random() * 360}, 100%, 50%, 1)`;

function addRectangle(x, y) {
    rectangles.push(new Rectangle(x, y, randomHsl()));
    dragIndex = rectangles.length - 1;
    isDragging = true;
}

function removeRectangle(x, y) {
    rectangles = rectangles.filter(rect => !isPointInside(x, y, rect));
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', function(e) {
    const pos = getMousePos(e);
    if (e.button === 0) { // Left click
        for (let i = rectangles.length - 1; i >= 0; i--) {
            if (isPointInside(pos.x, pos.y, rectangles[i])) {
                isDragging = true;
                dragIndex = i;
                dragOffsetX = pos.x - rectangles[i].x;
                dragOffsetY = pos.y - rectangles[i].y;
                return;
            }
        }
        addRectangle(pos.x, pos.y);
    } else if (e.button === 2) { // Right click
        removeRectangle(pos.x, pos.y);
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (isDragging) {
        const pos = getMousePos(e);
        rectangles[dragIndex].x = pos.x - dragOffsetX;
        rectangles[dragIndex].y = pos.y - dragOffsetY;
    }
});

canvas.addEventListener('mouseup', function() {
    isDragging = false;
    dragIndex = -1;

    //send a message to the server with the current state
    socket.send(JSON.stringify(rectangles));

});

document.addEventListener('keydown', function(e) {
    if (e.key === 'r' || e.key == 'R') {
        isDragging = false;
        dragIndex = -1;
        rectangles = [];
        //send a message to the server with the current state
        socket.send(JSON.stringify(rectangles));
    }
});

canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

canvas.style.backgroundColor = '#414141';
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.border = '0';
document.body.style.overflow = 'hidden';

resizeCanvas();
drawRectangles();
window.addEventListener('resize', resizeCanvas);
