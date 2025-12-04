package main

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type Todo struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"createdAt"`
}

type Store struct {
	mu     sync.RWMutex
	todos  map[int]*Todo
	nextID int
}

func NewStore() *Store {
	return &Store{
		todos:  make(map[int]*Todo),
		nextID: 1,
	}
}

func (s *Store) GetAll() []*Todo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	todos := make([]*Todo, 0, len(s.todos))
	for _, todo := range s.todos {
		todos = append(todos, todo)
	}
	return todos
}

func (s *Store) Create(title string) *Todo {
	s.mu.Lock()
	defer s.mu.Unlock()

	todo := &Todo{
		ID:        s.nextID,
		Title:     title,
		Completed: false,
		CreatedAt: time.Now(),
	}
	s.todos[s.nextID] = todo
	s.nextID++
	return todo
}

func (s *Store) Update(id int, completed bool) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if todo, exists := s.todos[id]; exists {
		todo.Completed = completed
		return true
	}
	return false
}

func (s *Store) Delete(id int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.todos[id]; exists {
		delete(s.todos, id)
		return true
	}
	return false
}

var store = NewStore()

func main() {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		c.Next()
	})

	r.GET("/api/todos", func(c *gin.Context) {
		todos := store.GetAll()
		c.JSON(http.StatusOK, todos)
	})

	r.POST("/api/todos", func(c *gin.Context) {
		var req struct {
			Title string `json:"title" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		todo := store.Create(req.Title)
		c.JSON(http.StatusCreated, todo)
	})

	r.PUT("/api/todos/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var req struct {
			Completed bool `json:"completed"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if !store.Update(id, req.Completed) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "updated"})
	})

	r.DELETE("/api/todos/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		if !store.Delete(id) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "deleted"})
	})

	r.Static("/", "./static")

	r.Run(":8080")
}
