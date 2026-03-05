CXX = g++
CXXFLAGS = -O2 -std=c++17

ifeq ($(OS),Windows_NT)
	TARGET = graph_engine.exe
else
	TARGET = graph_engine
endif

all: $(TARGET)

$(TARGET): graph_engine.cpp json.hpp
	$(CXX) $(CXXFLAGS) -o $(TARGET) graph_engine.cpp

clean:
ifeq ($(OS),Windows_NT)
	del /f $(TARGET) 2>nul
else
	rm -f $(TARGET)
endif

.PHONY: all clean
