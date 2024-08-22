package main

import (
	// "encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"golang.org/x/net/websocket"
)

var (
	state         string
	mu            sync.Mutex
	clients       = make(map[*websocket.Conn]struct{})
	clientsMu     sync.Mutex
	bytesSent     int
	bytesReceived int
	rectangles    []Rectangle
)

type Rectangle struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Color string  `json:"color"`
	ID    int64   `json:"id"`
}

type Msg struct {
	Type string    `json:"type"`
	Rect Rectangle `json:"rect"`
}

func main() {
	http.Handle("/ws", websocket.Handler(handleWebSocket))

	// Start the WebSocket server on port 8080.
	fmt.Println("WebSocket server started at ws://localhost:8080/ws")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}

func broadcastUpdate() {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	fmt.Println("Clients: ", len(clients))
	for client := range clients {
		// Send updated state to the client
		bytes := len([]byte(state))
		bytesSent += bytes
		if err := websocket.Message.Send(client, state); err != nil {
			log.Println("Error sending message:", err)
			client.Close()          // Close the connection if sending fails
			delete(clients, client) // Remove client from the map
		}
	}
	fmt.Println("bytes received: ", bytesReceived)
	fmt.Println("bytes sent: ", bytesSent)
	fmt.Println()
}

// handleWebSocket handles WebSocket connections.
func handleWebSocket(ws *websocket.Conn) {
	clientsMu.Lock()
	clients[ws] = struct{}{}
	clientsMu.Unlock()

	remoteAddr := ws.Request().Header.Get("X-Forwarded-For")
	//validation remoteAddr
	if remoteAddr == "" {
		remoteAddr = ws.Request().RemoteAddr
	} else {
		remoteAddr = strings.Split(remoteAddr, ",")[0]
	}

	fmt.Println("New connection from:", remoteAddr)

	//Sending a greeting from the server to new clients
	response := "Hello from Go Server!"
	if err := websocket.Message.Send(ws, response); err != nil {
		log.Println("Error sending message:", err)
		return
	}

	//Sending current state to new clients that joined

	/* 	if len(state) > 0 {
		initialState := state
		bytes := len([]byte(state))
		bytesSent += bytes
		if err := websocket.Message.Send(ws, initialState); err != nil {
			log.Println("Error sending message:", err)
			return
		}
	} */

	go func() {
		for {
			var msg Msg
			if err := websocket.JSON.Receive(ws, &msg); err != nil {
				if err.Error() == "EOF" {
					fmt.Println("Connection closed.")
					clientsMu.Lock()
					delete(clients, ws)
					clientsMu.Unlock()
					ws.Close()
					return
				}
				log.Println("Error receiving message:", err)
				break
			}
			/* bytes := len([]byte(msg))
			bytesReceived += bytes */

			fmt.Println("Received message of size " /* , bytes */, " from:", remoteAddr, msg)

			//old code for unmarshaling json data that is replaced by using websocket.JSON.Receive
			/* var message Msg
			if err := json.Unmarshal([]byte(msg), &message); err != nil {
				log.Println("Error decoding JSON:", err)
				return
			} */

			fmt.Println(msg)

			mu.Lock()
			//state = msg
			mu.Unlock()
			broadcastUpdate()
		}
	}()

	<-make(chan struct{})
}
