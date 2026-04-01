#include <iostream>
#include <vector>
#include <stack>
#include <queue>
#include <string>
#include <algorithm>
#include <functional>
#include <set>
#include <climits>
#include <numeric>
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
    adj.assign(N, vector<int>());
    visited.assign(N, false);

    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<vector<int>> allComponents;
    for (int i = 0; i < N; i++) {
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
    adj.assign(N, vector<int>());
    visited.assign(N, false);

    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<vector<int>> allComponents;
    for (int i = 0; i < N; i++) {
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


// ========== TUGAS 3 ==========

// Check Bipartite Graph
json checkBipartite(int N, const vector<pair<int,int>>& edgeList) {
    adj.assign(N, vector<int>());
    
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<int> color(N, -1);
    bool isBipartite = true;

    for (int start = 0; start < N; start++) {
        if (color[start] != -1) continue;

        queue<int> q;
        q.push(start);
        color[start] = 0;

        while (!q.empty() && isBipartite) {
            int u = q.front();
            q.pop();

            for (int v : adj[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];
                    q.push(v);
                } else if (color[v] == color[u]) {
                    isBipartite = false;
                    break;
                }
            }
        }
        if (!isBipartite) break;
    }

    json partitionA = json::array();
    json partitionB = json::array();
    
    for (int i = 0; i < N; i++) {
        if (color[i] == 0) {
            partitionA.push_back(i);
        } else if (color[i] == 1) {
            partitionB.push_back(i);
        }
    }

    return json{
        {"isBipartite", isBipartite},
        {"partitionA", partitionA},
        {"partitionB", partitionB}
    };
}

// Check Cycle using DFS
json checkCycle(int N, const vector<pair<int,int>>& edgeList) {
    adj.assign(N, vector<int>());
    visited.assign(N, false);

    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<int> parent(N, -1);
    vector<int> cyclePath;
    bool foundCycle = false;

    function<void(int, int)> dfsCycle = [&](int u, int p) {
        visited[u] = true;
        parent[u] = p;

        for (int v : adj[u]) {
            if (!visited[v]) {
                dfsCycle(v, u);
            } else if (v != p && !foundCycle) {
                // Found a cycle
                foundCycle = true;
                int curr = u;
                while (curr != v) {
                    cyclePath.push_back(curr);
                    curr = parent[curr];
                }
                cyclePath.push_back(v);
                reverse(cyclePath.begin(), cyclePath.end());
            }
        }
    };

    for (int i = 0; i < N; i++) {
        if (!visited[i] && !foundCycle) {
            dfsCycle(i, -1);
        }
    }

    return json{
        {"hasCycle", foundCycle},
        {"cyclePath", cyclePath}
    };
}

// Check diameter by BFS from every node
json computeDiameter(int N, const vector<pair<int,int>>& edgeList) {
    adj.assign(N, vector<int>());
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    int bestDist = -1;
    vector<int> bestPath;
    // BFS helper
    vector<bool> vis;
    vector<int> parent;
    queue<int> q;

    for (int start = 0; start < N; start++) {
        vis.assign(N, false);
        parent.assign(N, -1);
        q = queue<int>();

        vis[start] = true;
        q.push(start);

        while (!q.empty()) {
            int u = q.front();
            q.pop();

            for (int v : adj[u]) {
                if (!vis[v]) {
                    vis[v] = true;
                    parent[v] = u;
                    q.push(v);
                }
            }
        }

        // after BFS from start, find farthest node
        for (int end = 0; end < N; end++) {
            if (end == start || parent[end] == -1) continue;
            // compute distance by following parent
            int dist = 0;
            int cur = end;
            vector<int> path;
            while (cur != -1) {
                path.push_back(cur);
                cur = parent[cur];
                dist++;
            }
            if (dist > bestDist) {
                bestDist = dist;
                bestPath = path;          // currently reversed: end->...->start
                reverse(bestPath.begin(), bestPath.end()); // make start->...->end
            }
        }
    }

    // bestDist includes count of nodes; diameter length as edges = bestDist - 1
    return json{
        {"diameter", bestDist > 0 ? bestDist - 1 : 0},
        {"path", bestPath}
    };
}

// Compute Girth (shortest cycle)
json computeGirth(int N, const vector<pair<int,int>>& edgeList) {
    adj.assign(N, vector<int>());
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    int minGirth = INT_MAX;
    vector<int> girthCycle;

    for (int start = 0; start < N; start++) {
        vector<int> dist(N, -1);
        vector<int> parent(N, -1);
        queue<int> q;

        dist[start] = 0;
        q.push(start);

        while (!q.empty()) {
            int u = q.front();
            q.pop();

            for (int v : adj[u]) {
                if (dist[v] == -1) {
                    // Node not visited
                    dist[v] = dist[u] + 1;
                    parent[v] = u;
                    q.push(v);
                } else if (parent[u] != v) {
                    // Cycle detected
                    int cycleLen = dist[u] + dist[v] + 1;
                    if (cycleLen < minGirth) {
                        minGirth = cycleLen;
                        // Reconstruct cycle path
                        girthCycle.clear();
                        int cur = u;
                        while (cur != -1) {
                            girthCycle.push_back(cur);
                            cur = parent[cur];
                        }
                        vector<int> pathV;
                        cur = v;
                        while (cur != -1) {
                            pathV.push_back(cur);
                            cur = parent[cur];
                        }
                        // Find common ancestor and build cycle
                        set<int> ancestorsU(girthCycle.begin(), girthCycle.end());
                        vector<int> finalCycle;
                        cur = v;
                        while (ancestorsU.find(cur) == ancestorsU.end()) {
                            finalCycle.push_back(cur);
                            cur = parent[cur];
                        }
                        finalCycle.push_back(cur); // common ancestor
                        reverse(finalCycle.begin(), finalCycle.end());
                        for (int node : girthCycle) {
                            if (node == cur) break;
                            finalCycle.push_back(node);
                        }
                        girthCycle = finalCycle;
                    }
                }
            }
        }
    }

    return json{
        {"girth", minGirth == INT_MAX ? -1 : minGirth},
        {"cycle", girthCycle}
    };
}

// ========== TUGAS 4 ==========

// Dijkstra Shortest Path (weighted, undirected)
json shortestPath(int N, const vector<tuple<int,int,int>>& weightedEdges, int src, int dst) {
    if (src < 0 || src >= N || dst < 0 || dst >= N) {
        return json{{"reachable", false}, {"distance", -1}, {"path", json::array()}};
    }

    vector<vector<pair<int,int>>> adjW(N);
    for (const auto& e : weightedEdges) {
        int u = get<0>(e), v = get<1>(e), w = get<2>(e);
        adjW[u].push_back({v, w});
        adjW[v].push_back({u, w});
    }

    vector<int> dist(N, INT_MAX);
    vector<int> parent(N, -1);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;

    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adjW[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                parent[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    if (dist[dst] == INT_MAX) {
        return json{{"reachable", false}, {"distance", -1}, {"path", json::array()}};
    }

    vector<int> path;
    for (int cur = dst; cur != -1; cur = parent[cur]) {
        path.push_back(cur);
    }
    reverse(path.begin(), path.end());

    return json{{"reachable", true}, {"distance", dist[dst]}, {"path", path}};
}

// Union-Find untuk Kruskal
struct UnionFind {
    vector<int> parent, rank_;
    UnionFind(int n) : parent(n), rank_(n, 0) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    bool unite(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        if (rank_[px] < rank_[py]) swap(px, py);
        parent[py] = px;
        if (rank_[px] == rank_[py]) rank_[px]++;
        return true;
    }
};

// Kruskal Minimum Spanning Tree
json computeMST(int N, const vector<tuple<int,int,int>>& weightedEdges) {
    vector<tuple<int,int,int>> sorted_edges = weightedEdges;
    sort(sorted_edges.begin(), sorted_edges.end(), [](const auto& a, const auto& b) {
        return get<2>(a) < get<2>(b);
    });

    UnionFind uf(N);
    json mstEdgesJson = json::array();
    int totalWeight = 0;
    int edgeCount = 0;

    for (const auto& e : sorted_edges) {
        int u = get<0>(e), v = get<1>(e), w = get<2>(e);
        if (uf.unite(u, v)) {
            mstEdgesJson.push_back({u, v, w});
            totalWeight += w;
            edgeCount++;
            if (edgeCount == N - 1) break;
        }
    }

    bool connected = (edgeCount == N - 1);

    return json{
        {"connected", connected},
        {"totalWeight", totalWeight},
        {"mstEdges", mstEdgesJson}
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

        // ===== TUGAS 3: check bipartite, cycle, diameter & girth =====
        } else if (operation == "check_bipartite" || operation == "check_cycle" || operation == "diameter" || operation == "girth") {

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
                    if (u == v) continue;
                    edgeList.push_back({u, v});
                }
            }

            if (operation == "check_bipartite") {
                json bipartiteResult = checkBipartite(N, edgeList);
                result = json{
                    {"success", true},
                    {"isBipartite", bipartiteResult["isBipartite"]},
                    {"partitionA", bipartiteResult["partitionA"]},
                    {"partitionB", bipartiteResult["partitionB"]}
                };
            } else if (operation == "check_cycle") {
                json cycleResult = checkCycle(N, edgeList);
                result = json{
                    {"success", true},
                    {"hasCycle", cycleResult["hasCycle"]},
                    {"cyclePath", cycleResult["cyclePath"]}
                };
            } else if (operation == "diameter") {
                json dres = computeDiameter(N, edgeList);
                result = json{
                    {"success", true},
                    {"diameter", dres["diameter"]},
                    {"path", dres["path"]}
                };
            } else if (operation == "girth") {
                json gres = computeGirth(N, edgeList);
                result = json{
                    {"success", true},
                    {"girth", gres["girth"]},
                    {"cycle", gres["cycle"]}
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

        } else if (operation == "shortest_path") {
            int N = input.at("numVertices").get<int>();
            if (N <= 0 || N > 500) {
                cout << json{{"success", false}, {"error", "numVertices harus 1-500"}}.dump() << endl;
                return 0;
            }
            int a = input.at("nodeA").get<int>();
            int b = input.at("nodeB").get<int>();
            if (a < 0 || a >= N || b < 0 || b >= N) {
                cout << json{{"success", false}, {"error", "nodeA atau nodeB diluar index"}}.dump() << endl;
                return 0;
            }

            vector<tuple<int,int,int>> weightedEdges;
            if (input.contains("edges")) {
                for (auto& e : input["edges"]) {
                    int u = e[0].get<int>();
                    int v = e[1].get<int>();
                    int w = (int)e.size() >= 3 ? e[2].get<int>() : 1;
                    if (u == v) continue;
                    if (w < 0) continue; // Dijkstra tidak valid untuk bobot negatif
                    weightedEdges.push_back({u, v, w});
                }
            }

            json spResult = shortestPath(N, weightedEdges, a, b);
            result = json{
                {"success", true},
                {"reachable", spResult["reachable"]},
                {"distance", spResult["distance"]},
                {"path", spResult["path"]}
            };

        } else if (operation == "min_spanning_tree") {
            int N = input.at("numVertices").get<int>();
            if (N <= 0 || N > 500) {
                cout << json{{"success", false}, {"error", "numVertices harus 1-500"}}.dump() << endl;
                return 0;
            }

            vector<tuple<int,int,int>> weightedEdges;
            if (input.contains("edges")) {
                for (auto& e : input["edges"]) {
                    int u = e[0].get<int>();
                    int v = e[1].get<int>();
                    int w = (int)e.size() >= 3 ? e[2].get<int>() : 1;
                    if (u == v) continue;
                    if (w < 0) continue;
                    weightedEdges.push_back({u, v, w});
                }
            }

            json mstResult = computeMST(N, weightedEdges);
            result = json{
                {"success", true},
                {"connected", mstResult["connected"]},
                {"totalWeight", mstResult["totalWeight"]},
                {"mstEdges", mstResult["mstEdges"]}
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
