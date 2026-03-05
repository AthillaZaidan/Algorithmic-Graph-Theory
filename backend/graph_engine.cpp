#include <iostream>
#include <vector>
#include <stack>
#include <queue>
#include <string>
#include <algorithm>
#include "json.hpp"

using json = nlohmann::json;
using namespace std;


// ========== TUGAS 1  ==========

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
            return;
        }
        // validasi self-loop
        if (src == dest) {
            return;
        }
        // validasi duplicate edge
        for (int neighbor : adjList[src]) {
            if (neighbor == dest) {
                return;
            }
        }
        adjList[src].push_back(dest);
        adjList[dest].push_back(src);
    }


    // 1. DFS
    vector<int> DFS(int start) {
        vector<int> order;
        if (start < 0 || start >= (int)adjList.size()) {
            return order;
        }
        vector<bool> visited(adjList.size(), false);
        stack<int> s;

        s.push(start);

        while (!s.empty()) {
            int top = s.top();
            s.pop();

            if (visited[top]) continue;

            visited[top] = true;
            order.push_back(top);

            for (int i = (int)adjList[top].size() - 1; i >= 0; i--) {
                if (!visited[adjList[top][i]]) {
                    s.push(adjList[top][i]);
                }
            }
        }
        return order;
    }


    // 2. BFS
    vector<int> BFS(int start) {
        vector<int> order;
        if (start < 0 || start >= (int)adjList.size()) {
            return order;
        }
        vector<bool> visited(adjList.size(), false);
        queue<int> q;

        visited[start] = true;
        q.push(start);

        while (!q.empty()) {
            int front = q.front();
            q.pop();

            order.push_back(front);

            for (int neighbor : adjList[front]) {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    q.push(neighbor);
                }
            }
        }
        return order;
    }


    // 3. Cek apakah ada lintasan dari a ke b
    json cekPath(int a, int b) {
        if (a < 0 || a >= (int)adjList.size() ||
            b < 0 || b >= (int)adjList.size()) {
            return json{{"found", false}, {"path", json::array()}};
        }
        if (a == b) {
            return json{{"found", true}, {"path", json::array({a})}};
        }

        vector<bool> visited(adjList.size(), false);
        vector<int> parent(adjList.size(), -1);
        queue<int> q;
        visited[a] = true;
        q.push(a);

        while (!q.empty()) {
            int front = q.front();
            q.pop();

            if (front == b) {
                // Reconstruct path
                vector<int> path;
                for (int cur = b; cur != -1; cur = parent[cur]) {
                    path.push_back(cur);
                }
                reverse(path.begin(), path.end());
                return json{{"found", true}, {"path", path}};
            }

            for (int neighbor : adjList[front]) {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    parent[neighbor] = front;
                    q.push(neighbor);
                }
            }
        }
        return json{{"found", false}, {"path", json::array()}};
    }


    // 4. Cek keterhubungan graf
    json cekKeterhubungan() {
        if (adjList.size() == 0) {
            return json{{"connected", true}, {"reachable", 0}, {"total", 0}};
        }

        vector<bool> visited(adjList.size(), false);
        queue<int> q;
        visited[0] = true;
        q.push(0);

        int count = 0;

        while (!q.empty()) {
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

        return json{
            {"connected", count == (int)adjList.size()},
            {"reachable", count},
            {"total", (int)adjList.size()}
        };
    }
};


// ========== TUGAS 2 ==========]

vector<vector<int>> adj;
vector<bool> visited;

// Recursive DFS untuk cari komponen 
void dfsGraph(int u, vector<int>& nodes) {
    visited[u] = true;
    nodes.push_back(u);
    for (int v : adj[u]) {
        if (!visited[v]) dfsGraph(v, nodes);
    }
}

// Hitung Jumlah Komponen (opsi 1 di  )
json hitungJumlahKomponen(int N, int M, const vector<pair<int,int>>& edgeList) {
    adj.assign(N + 1, vector<int>());
    visited.assign(N + 1, false);

    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 1 && u <= N && v >= 1 && v <= N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<vector<int>> allComponents;
    for (int i = 1; i <= N; i++) {
        if (!visited[i]) {
            vector<int> currentNodes;
            dfsGraph(i, currentNodes);
            allComponents.push_back(currentNodes);
        }
    }

    json components = json::array();
    for (auto& comp : allComponents) {
        components.push_back(comp);
    }

    return json{
        {"count", (int)allComponents.size()},
        {"components", components}
    };
}

// Cari Komponen Terbesar 
json cariKomponenTerbesar(int N, int M, const vector<pair<int,int>>& edgeList) {
    adj.assign(N + 1, vector<int>());
    visited.assign(N + 1, false);

    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 1 && u <= N && v >= 1 && v <= N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<vector<int>> allComponents;
    for (int i = 1; i <= N; i++) {
        if (!visited[i]) {
            vector<int> currentNodes;
            dfsGraph(i, currentNodes);
            allComponents.push_back(currentNodes);
        }
    }

    // Cari komponen dengan size terbesar
    int maxIdx = 0;
    for (int i = 1; i < (int)allComponents.size(); i++) {
        if (allComponents[i].size() > allComponents[maxIdx].size()) maxIdx = i;
    }

    json components = json::array();
    for (auto& comp : allComponents) {
        components.push_back(comp);
    }

    return json{
        {"count", (int)allComponents.size()},
        {"components", components},
        {"largestIndex", maxIdx},
        {"largestSize", (int)allComponents[maxIdx].size()},
        {"largestNodes", allComponents[maxIdx]}
    };
}


// BFS Grid untuk hitung island 
void bfsGrid(int r, int c, vector<vector<char>>& grid, vector<vector<bool>>& vis, vector<vector<int>>& labels, int label) {
    int n = grid.size();
    int m = grid[0].size();
    queue<pair<int, int>> q;
    q.push({r, c});
    vis[r][c] = true;
    labels[r][c] = label;

    int dr[] = {-1, 1, 0, 0};
    int dc[] = {0, 0, -1, 1};

    while (!q.empty()) {
        pair<int, int> curr = q.front();
        q.pop();

        for (int i = 0; i < 4; i++) {
            int nr = curr.first + dr[i];
            int nc = curr.second + dc[i];
            if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] == '*' && !vis[nr][nc]) {
                vis[nr][nc] = true;
                labels[nr][nc] = label;
                q.push({nr, nc});
            }
        }
    }
}

// Hitung Jumlah Island 
json hitungJumlahIsland(const vector<string>& gridRows) {
    int N = gridRows.size();
    if (N == 0) return json{{"count", 0}, {"labels", json::array()}};
    int M = gridRows[0].size();

    vector<vector<char>> grid(N, vector<char>(M));
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < M && j < (int)gridRows[i].size(); j++) {
            grid[i][j] = gridRows[i][j];
        }
    }

    vector<vector<bool>> vis(N, vector<bool>(M, false));
    vector<vector<int>> labels(N, vector<int>(M, 0));
    int islandCount = 0;

    for (int i = 0; i < N; i++) {
        for (int j = 0; j < M; j++) {
            if (grid[i][j] == '*' && !vis[i][j]) {
                islandCount++;
                bfsGrid(i, j, grid, vis, labels, islandCount);
            }
        }
    }

    json labelGrid = json::array();
    for (int i = 0; i < N; i++) {
        json row = json::array();
        for (int j = 0; j < M; j++) {
            row.push_back(labels[i][j]);
        }
        labelGrid.push_back(row);
    }

    return json{
        {"count", islandCount},
        {"labels", labelGrid}
    };
}


// ========== Main: Read JSON from stdin, dispatch, write JSON to stdout ==========

int main() {
    try {
        json input;
        cin >> input;

        string operation = input.at("operation").get<string>();
        json result;

        // ===== TUGAS 1: menggunakan class Graph =====
        if (operation == "dfs" || operation == "bfs" || operation == "check_path" ||
            operation == "check_connectivity") {

            int numVertices = input.at("numVertices").get<int>();
            if (numVertices < 0 || numVertices > 500) {
                cout << json{{"success", false}, {"error", "numVertices harus 0-500"}}.dump() << endl;
                return 0;
            }

            Graph g(numVertices);

            if (input.contains("edges")) {
                for (auto& e : input["edges"]) {
                    int src = e[0].get<int>();
                    int dest = e[1].get<int>();
                    g.addEdge(src, dest);
                }
            }

            if (operation == "dfs") {
                int start = input.at("startNode").get<int>();
                if (start < 0 || start >= numVertices) {
                    cout << json{{"success", false}, {"error", "startNode diluar index"}}.dump() << endl;
                    return 0;
                }
                result = json{{"success", true}, {"traversal", g.DFS(start)}};

            } else if (operation == "bfs") {
                int start = input.at("startNode").get<int>();
                if (start < 0 || start >= numVertices) {
                    cout << json{{"success", false}, {"error", "startNode diluar index"}}.dump() << endl;
                    return 0;
                }
                result = json{{"success", true}, {"traversal", g.BFS(start)}};

            } else if (operation == "check_path") {
                int a = input.at("nodeA").get<int>();
                int b = input.at("nodeB").get<int>();
                if (a < 0 || a >= numVertices || b < 0 || b >= numVertices) {
                    cout << json{{"success", false}, {"error", "nodeA atau nodeB diluar index"}}.dump() << endl;
                    return 0;
                }
                json pathResult = g.cekPath(a, b);
                result = json{{"success", true}, {"found", pathResult["found"]}, {"path", pathResult["path"]}};

            } else if (operation == "check_connectivity") {
                json connResult = g.cekKeterhubungan();
                result = json{
                    {"success", true},
                    {"connected", connResult["connected"]},
                    {"reachable", connResult["reachable"]},
                    {"total", connResult["total"]}
                };
            }

        // ===== TUGAS 2: menggunakan global adj + dfsGraph / bfsGrid =====
        } else if (operation == "count_components" || operation == "largest_component") {

            int N = input.at("numVertices").get<int>();
            if (N < 0 || N > 500) {
                cout << json{{"success", false}, {"error", "numVertices harus 0-500"}}.dump() << endl;
                return 0;
            }

            vector<pair<int,int>> edgeList;
            if (input.contains("edges")) {
                for (auto& e : input["edges"]) {
                    int u = e[0].get<int>();
                    int v = e[1].get<int>();
                    if (u == v) continue; // skip self-loop
                    edgeList.push_back({u, v});
                }
            }

            int M = (int)edgeList.size();

            if (operation == "count_components") {
                json compResult = hitungJumlahKomponen(N, M, edgeList);
                result = json{
                    {"success", true},
                    {"count", compResult["count"]},
                    {"components", compResult["components"]}
                };

            } else if (operation == "largest_component") {
                json compResult = cariKomponenTerbesar(N, M, edgeList);
                result = json{
                    {"success", true},
                    {"count", compResult["count"]},
                    {"components", compResult["components"]},
                    {"largestIndex", compResult["largestIndex"]},
                    {"largestSize", compResult["largestSize"]},
                    {"largestNodes", compResult["largestNodes"]}
                };
            }

        } else if (operation == "count_islands") {
            vector<string> gridRows;
            for (auto& row : input.at("grid")) {
                gridRows.push_back(row.get<string>());
            }
            if (gridRows.size() > 100 || (!gridRows.empty() && gridRows[0].size() > 100)) {
                cout << json{{"success", false}, {"error", "Grid terlalu besar (max 100x100)"}}.dump() << endl;
                return 0;
            }
            json islandResult = hitungJumlahIsland(gridRows);
            result = json{
                {"success", true},
                {"count", islandResult["count"]},
                {"labels", islandResult["labels"]}
            };

        } else {
            result = json{{"success", false}, {"error", "Operasi tidak dikenal: " + operation}};
        }

        cout << result.dump() << endl;

    } catch (const json::exception& e) {
        cout << json{{"success", false}, {"error", string("JSON parse error: ") + e.what()}}.dump() << endl;
    } catch (const exception& e) {
        cout << json{{"success", false}, {"error", string("Error: ") + e.what()}}.dump() << endl;
    }

    return 0;
}
