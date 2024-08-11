package main

import (
	"fmt"
	"golang.org/x/net/websocket"
	"log"
	"net/http"
	"sync"
)

var (
	state     string
	mu        sync.Mutex
	clients   = make(map[*websocket.Conn]struct{})
	clientsMu sync.Mutex
)

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
	for client := range clients {
		// Send updated state to the client
		if err := websocket.Message.Send(client, state); err != nil {
			log.Println("Error sending message:", err)
			client.Close()          // Close the connection if sending fails
			delete(clients, client) // Remove client from the map
		}
	}
}

// handleWebSocket handles WebSocket connections.
func handleWebSocket(ws *websocket.Conn) {
	clientsMu.Lock()
	clients[ws] = struct{}{}
	clientsMu.Unlock()

	remoteAddr := ws.Request().RemoteAddr
	fmt.Println("New connection from:", remoteAddr)

	response := "Hello from Go Server!"
	if err := websocket.Message.Send(ws, response); err != nil {
		log.Println("Error sending message:", err)
		return
	}

	if len(state) > 0 {
		initialState := state
		if err := websocket.Message.Send(ws, initialState); err != nil {
			log.Println("Error sending message:", err)
			return
		}
	}

	go func() {
		for {
			var msg string
			if err := websocket.Message.Receive(ws, &msg); err != nil {
				if err.Error() == "EOF" {
					fmt.Println("Connection closed.")
					clientsMu.Lock()
					delete(clients, ws)
					clientsMu.Unlock()
					return
				}
				log.Println("Error receiving message:", err)
				break
			}
			fmt.Println("Received message from:", remoteAddr)

			mu.Lock()
			state = msg
			mu.Unlock()
			broadcastUpdate()
		}
	}()

	<-make(chan struct{})
}
