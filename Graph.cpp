#include <iostream>
#include <vector>
#include <stack>
#include <queue>
using namespace std;



class Graph {
private:
    vector<vector<int>> adjList;



public:
  Graph(int numVertices) {
    adjList.resize(numVertices);
  }



  void addEdge(int src, int dest) {
    // validasi bounds
    if (src < 0 || src >= (int)adjList.size() || 
      dest < 0 || dest >= (int)adjList.size()) {
      cout << "edge invalid" << endl;
      return;
    }
    // validasi self-loop
    if (src == dest) {
      cout << "Self-loop tidak diperbolehkan" << endl;
      return;
    }
    // validasi duplicate edge
    for (int neighbor : adjList[src]) {
      if (neighbor == dest) {
        cout << "Edge " << src << "-" << dest << " sudah ada" << endl;
        return;
      }
    }
    adjList[src].push_back(dest);
    adjList[dest].push_back(src);
  }


  // ========== TUGAS 1 ==========


  // 1. DFS
  void DFS(int start){
    if (start < 0 || start >= (int)adjList.size()) {
      cout << "Vertices diluar index" << endl;
      return;
    }
    vector<bool> visited(adjList.size(), false);
    stack<int> s;


    s.push(start);


    cout << "DFS dari node " << start << ": ";


    while (!s.empty()){
      int top = s.top();
      s.pop();

      if(visited[top]) continue;


      visited[top] = true;
      cout << top << " ";


      for (int i = (int)adjList[top].size() - 1; i >= 0; i--) {
        if (!visited[adjList[top][i]]) {
          s.push(adjList[top][i]);
        }
      }
    }
    cout << endl;
  }


  // 2. BFS
  void BFS(int start){
    if (start < 0 || start >= (int)adjList.size()) {
      cout << "Vertices diluar index" << endl;
      return;
    }
    vector<bool> visited(adjList.size(), false);
    queue<int> q;


    visited[start] = true;
    q.push(start);


    cout << "BFS dari node " << start << ": ";


    while (!q.empty()){
      int front = q.front();
      q.pop();


      cout << front << " ";


      for (int neighbor : adjList[front]) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          q.push(neighbor);
        }
      }
    }
    cout << endl;
  }


  // 3. Cek apakah ada lintasan dari a ke b
  void cekPath(int a, int b){
    if (a < 0 || a >= (int)adjList.size() || 
        b < 0 || b >= (int)adjList.size()) {
      cout << "Vertices diluar index" << endl;
      return;
    }
    if (a == b) {
      cout << "Node " << a << " dan " << b << " sama, path ada" << endl;
      return;
    }


    vector<bool> visited(adjList.size(), false);
    queue<int> q;
    visited[a] = true;
    q.push(a);


    while (!q.empty()){
      int front = q.front();
      q.pop();


      if (front == b) {
        cout << "Ada lintasan dari " << a << " ke " << b << endl;
        return;
      }


      for (int neighbor : adjList[front]) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          q.push(neighbor);
        }
      }
    }
    cout << "Tidak ada lintasan dari " << a << " ke " << b << endl;
  }


  // 4. Cek keterhubungan graf
  void cekKeterhubungan(){
    if (adjList.size() == 0) {
      cout << "Graf kosong" << endl;
      return;
    }


    vector<bool> visited(adjList.size(), false);
    queue<int> q;
    visited[0] = true;
    q.push(0);


    int count = 0;


    while (!q.empty()){
      int front = q.front();
      q.pop();
      count++;


      for (int neighbor : adjList[front]) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          q.push(neighbor);
        }
      }
    }


    if (count == (int)adjList.size()) {
      cout << "Graf TERHUBUNG (connected)" << endl;
    } else {
      cout << "Graf TIDAK TERHUBUNG (disconnected)" << endl;
      cout << "Hanya " << count << " dari " << adjList.size() << " node yang terjangkau dari node 0" << endl;
    }
  }


  void printGraph() {
    for (int i = 0; i < (int)adjList.size(); ++i) {
      cout << i << "-> ";
      for (int j = 0; j < (int)adjList[i].size(); ++j) {
        cout << adjList[i][j] << " -> ";
      }
      cout << "NULL" << endl;
    }
  }



  void printMenu() {
    cout << "==================================" << endl;
    cout << "PILIH MENU" << endl;
    cout << "1. DFS" << endl;
    cout << "2. BFS" << endl;
    cout << "3. Cek Path A ke B" << endl;
    cout << "4. Cek Keterhubungan Graf" << endl;
    cout << "5. Jumlah Komponen" << endl;
    cout << "6. Komponen Terbesar" << endl;
    cout << "7. Jumlah Island" << endl;
    cout << "0. Keluar" << endl;
    cout << "==================================" << endl;
  }
};



int main() {
    int numVertices, numEdges; 
    cout << "Jumlah Vertices: ";
    cin >> numVertices;
    cout << "Jumlah Edges: ";
    cin >> numEdges;


    // validasi max edges
    int maxEdges = numVertices * (numVertices - 1) / 2;
    if (numEdges < 0 || numEdges > maxEdges) {
      cout << "Invalid! Jumlah edge harus 0 - " << maxEdges << endl;
      return 1;
    }


    Graph g(numVertices);



    for (int i = 0; i < numEdges; i++) {

      int src, dest;
      cout << "Vertices Asal: ";
      cin >> src;
      cout << "Vertices Destination: ";
      cin >> dest;
      g.addEdge(src, dest);
    }



    g.printGraph();


    int choice;
    do {
      g.printMenu();
      cout << "Pilihan: ";
      cin >> choice;


      switch (choice) {
        case 1: {
          int start;
          cout << "Start node: ";
          cin >> start;
          g.DFS(start);
          break;
        }
        case 2: {
          int start;
          cout << "Start node: ";
          cin >> start;
          g.BFS(start);
          break;
        }
        case 3: {
          int a, b;
          cout << "Node A: ";
          cin >> a;
          cout << "Node B: ";
          cin >> b;
          g.cekPath(a, b);
          break;
        }
        case 4: {
          g.cekKeterhubungan();
          break;
        }
        case 0:
          cout << "Keluar..." << endl;
          break;
        default:
          cout << "Pilihan invalid / belum diimplementasi" << endl;
          break;
      }
    } while (choice != 0);


    return 0;
}