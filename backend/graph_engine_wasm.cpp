#include <emscripten.h>
#include <string>
#include <vector>
#include <stack>
#include <queue>
#include <algorithm>
#include <functional>
#include <set>
#include <climits>
#include <numeric>
#include <tuple>
#include <cmath>
#include <chrono>
#include <cstdlib>

#include "json.hpp"

using json = nlohmann::json;
using namespace std;

extern "C" {

// ========== TUGAS 1 ==========

class Graph {
private:
    vector<vector<int>> adjList;
public:
    Graph(int numVertices) { adjList.resize(numVertices); }
    void addEdge(int src, int dest) {
        if (src < 0 || src >= (int)adjList.size() || dest < 0 || dest >= (int)adjList.size()) return;
        if (src == dest) return;
        for (int neighbor : adjList[src]) { if (neighbor == dest) return; }
        adjList[src].push_back(dest);
        adjList[dest].push_back(src);
    }

    vector<int> DFS(int start) {
        vector<int> order;
        if (start < 0 || start >= (int)adjList.size()) return order;
        vector<bool> visited(adjList.size(), false);
        stack<int> s; s.push(start);
        while (!s.empty()) {
            int top = s.top(); s.pop();
            if (visited[top]) continue;
            visited[top] = true;
            order.push_back(top);
            for (int i = (int)adjList[top].size() - 1; i >= 0; i--)
                if (!visited[adjList[top][i]]) s.push(adjList[top][i]);
        }
        return order;
    }

    vector<int> BFS(int start) {
        vector<int> order;
        if (start < 0 || start >= (int)adjList.size()) return order;
        vector<bool> visited(adjList.size(), false);
        queue<int> q; visited[start] = true; q.push(start);
        while (!q.empty()) {
            int front = q.front(); q.pop();
            order.push_back(front);
            for (int neighbor : adjList[front])
                if (!visited[neighbor]) { visited[neighbor] = true; q.push(neighbor); }
        }
        return order;
    }

    json cekPath(int a, int b) {
        if (a < 0 || a >= (int)adjList.size() || b < 0 || b >= (int)adjList.size())
            return {{"found", false}, {"path", json::array()}};
        vector<int> path;
        vector<bool> visited(adjList.size(), false);
        vector<int> parent(adjList.size(), -1);
        queue<int> q; visited[a] = true; q.push(a);
        while (!q.empty()) {
            int cur = q.front(); q.pop();
            if (cur == b) {
                for (int node = b; node != -1; node = parent[node]) path.insert(path.begin(), node);
                return {{"found", true}, {"path", path}};
            }
            for (int neighbor : adjList[cur]) {
                if (!visited[neighbor]) { visited[neighbor] = true; parent[neighbor] = cur; q.push(neighbor); }
            }
        }
        return {{"found", false}, {"path", json::array()}};
    }

    json cekKeterhubungan() {
        int n = (int)adjList.size();
        if (n == 0) return {{"connected", true}, {"reachable", 0}, {"total", 0}};
        vector<bool> visited(n, false);
        int reachable = 0;
        queue<int> q; visited[0] = true; q.push(0);
        while (!q.empty()) {
            int cur = q.front(); q.pop(); reachable++;
            for (int neighbor : adjList[cur]) {
                if (!visited[neighbor]) { visited[neighbor] = true; q.push(neighbor); }
            }
        }
        return {{"connected", reachable == n}, {"reachable", reachable}, {"total", n}};
    }
};

// ========== TUGAS 2 & 3 helper functions ==========
// (Included inline to avoid multi-file compilation issues with WASM)

void dfsGraph(int node, const vector<pair<int,int>>& edges, vector<bool>& visited) {
    visited[node] = true;
    for (const auto& [u, v] : edges) {
        int neighbor = -1;
        if (u == node && !visited[v]) neighbor = v;
        else if (v == node && !visited[u]) neighbor = u;
        if (neighbor != -1) dfsGraph(neighbor, edges, visited);
    }
}

json hitungJumlahKomponen(int N, int M, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> adj(N);
    for (const auto& [u, v] : edgeList) {
        if (u >= 0 && u < N && v >= 0 && v < N) { adj[u].push_back(v); adj[v].push_back(u); }
    }
    vector<bool> visited(N, false);
    vector<vector<int>> components;
    for (int i = 0; i < N; i++) {
        if (!visited[i]) {
            vector<int> comp;
            queue<int> q; visited[i] = true; q.push(i);
            while (!q.empty()) {
                int cur = q.front(); q.pop(); comp.push_back(cur);
                for (int neighbor : adj[cur]) { if (!visited[neighbor]) { visited[neighbor] = true; q.push(neighbor); } }
            }
            components.push_back(comp);
        }
    }
    return {{"count", (int)components.size()}, {"components", components}};
}

json cariKomponenTerbesar(int N, int M, const vector<pair<int,int>>& edgeList) {
    auto result = hitungJumlahKomponen(N, M, edgeList);
    int maxIdx = 0, maxSize = 0;
    auto comps = result["components"].get<vector<vector<int>>>();
    for (int i = 0; i < (int)comps.size(); i++) {
        if ((int)comps[i].size() > maxSize) { maxSize = comps[i].size(); maxIdx = i; }
    }
    return {{"count", result["count"]}, {"components", result["components"]}, {"largestIndex", maxIdx}, {"largestSize", maxSize}, {"largestNodes", comps[maxIdx]}};
}

json hitungJumlahIsland(const vector<string>& grid) {
    if (grid.empty()) return {{"count", 0}, {"labels", json::array()}};
    int rows = grid.size(), cols = grid[0].size();
    vector<vector<int>> labels(rows, vector<int>(cols, 0));
    int islandCount = 0;
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (grid[i][j] == '1' && labels[i][j] == 0) {
                islandCount++;
                queue<pair<int,int>> q; q.push({i,j}); labels[i][j] = islandCount;
                while (!q.empty()) {
                    auto [r,c] = q.front(); q.pop();
                    for (auto [dr,dc] : vector<pair<int,int>>{{-1,0},{1,0},{0,-1},{0,1}}) {
                        int nr = r+dr, nc = c+dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1' && labels[nr][nc] == 0) {
                            labels[nr][nc] = islandCount; q.push({nr,nc});
                        }
                    }
                }
            }
        }
    }
    json labelsJson = json::array();
    for (int i = 0; i < rows; i++) { json row = json::array(); for (int j = 0; j < cols; j++) row.push_back(labels[i][j]); labelsJson.push_back(row); }
    return {{"count", islandCount}, {"labels", labelsJson}};
}

json checkBipartite(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> adj(N);
    for (const auto& [u, v] : edgeList) { if (u >= 0 && u < N && v >= 0 && v < N) { adj[u].push_back(v); adj[v].push_back(u); } }
    vector<int> color(N, -1); vector<int> partA, partB;
    for (int i = 0; i < N; i++) {
        if (color[i] == -1) {
            queue<int> q; color[i] = 0; q.push(i);
            while (!q.empty()) {
                int cur = q.front(); q.pop();
                if (color[cur] == 0) partA.push_back(cur); else partB.push_back(cur);
                for (int neighbor : adj[cur]) { if (color[neighbor] == -1) { color[neighbor] = 1 - color[cur]; q.push(neighbor); } else if (color[neighbor] == color[cur]) return {{"isBipartite", false}, {"partitionA", json::array()}, {"partitionB", json::array()}}; }
            }
        }
    }
    return {{"isBipartite", true}, {"partitionA", partA}, {"partitionB", partB}};
}

json maximumBipartiteMatching(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> adj(N);
    for (const auto& [u, v] : edgeList) {
        if (u >= 0 && u < N && v >= 0 && v < N) {
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
    }

    vector<int> color(N, -1), partA, partB;
    for (int start = 0; start < N; start++) {
        if (color[start] != -1) continue;
        queue<int> q;
        color[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            for (int v : adj[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];
                    q.push(v);
                } else if (color[v] == color[u]) {
                    return {{"isBipartite", false}, {"partitionA", json::array()}, {"partitionB", json::array()}, {"matchingSize", 0}, {"matchingEdges", json::array()}, {"unmatchedA", json::array()}, {"unmatchedB", json::array()}};
                }
            }
        }
    }

    for (int i = 0; i < N; i++) {
        if (color[i] == 0) partA.push_back(i);
        else if (color[i] == 1) partB.push_back(i);
    }

    vector<int> pairU(N, -1), pairV(N, -1), dist(N, INT_MAX);
    auto bfs = [&]() {
        queue<int> q;
        bool foundFreeRight = false;
        for (int u : partA) {
            if (pairU[u] == -1) { dist[u] = 0; q.push(u); }
            else dist[u] = INT_MAX;
        }
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            for (int v : adj[u]) {
                if (color[v] != 1) continue;
                int matchedU = pairV[v];
                if (matchedU == -1) foundFreeRight = true;
                else if (dist[matchedU] == INT_MAX) {
                    dist[matchedU] = dist[u] + 1;
                    q.push(matchedU);
                }
            }
        }
        return foundFreeRight;
    };

    function<bool(int)> dfs = [&](int u) {
        for (int v : adj[u]) {
            if (color[v] != 1) continue;
            int matchedU = pairV[v];
            if (matchedU == -1 || (dist[matchedU] == dist[u] + 1 && dfs(matchedU))) {
                pairU[u] = v;
                pairV[v] = u;
                return true;
            }
        }
        dist[u] = INT_MAX;
        return false;
    };

    int matchingSize = 0;
    while (bfs()) {
        for (int u : partA) {
            if (pairU[u] == -1 && dfs(u)) matchingSize++;
        }
    }

    json matchingEdges = json::array(), unmatchedA = json::array(), unmatchedB = json::array();
    for (int u : partA) {
        if (pairU[u] == -1) unmatchedA.push_back(u);
        else matchingEdges.push_back({u, pairU[u]});
    }
    for (int v : partB) {
        if (pairV[v] == -1) unmatchedB.push_back(v);
    }

    return {{"isBipartite", true}, {"partitionA", partA}, {"partitionB", partB}, {"matchingSize", matchingSize}, {"matchingEdges", matchingEdges}, {"unmatchedA", unmatchedA}, {"unmatchedB", unmatchedB}};
}

json checkCycle(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> adj(N);
    for (const auto& [u, v] : edgeList) { if (u >= 0 && u < N && v >= 0 && v < N) { adj[u].push_back(v); adj[v].push_back(u); } }
    vector<bool> visited(N, false); vector<int> parent(N, -1), cyclePath;
    function<bool(int,int)> dfs = [&](int node, int par) -> bool {
        visited[node] = true;
        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) { parent[neighbor] = node; if (dfs(neighbor, node)) return true; }
            else if (neighbor != par) {
                int cur = node; cyclePath = {neighbor};
                while (cur != neighbor && cur != -1) { cyclePath.push_back(cur); cur = parent[cur]; }
                cyclePath.push_back(neighbor); return true;
            }
        }
        return false;
    };
    for (int i = 0; i < N; i++) if (!visited[i] && dfs(i, -1)) return {{"hasCycle", true}, {"cyclePath", cyclePath}};
    return {{"hasCycle", false}, {"cyclePath", json::array()}};
}

json computeDiameter(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> adj(N);
    for (const auto& [u, v] : edgeList) { if (u >= 0 && u < N && v >= 0 && v < N) { adj[u].push_back(v); adj[v].push_back(u); } }
    int maxDist = 0; vector<int> bestPath;
    for (int s = 0; s < N; s++) {
        vector<int> dist(N, -1), parent(N, -1);
        queue<int> q; dist[s] = 0; q.push(s);
        while (!q.empty()) { int cur = q.front(); q.pop(); for (int neighbor : adj[cur]) { if (dist[neighbor] == -1) { dist[neighbor] = dist[cur]+1; parent[neighbor] = cur; q.push(neighbor); } } }
        for (int i = 0; i < N; i++) {
            if (dist[i] > maxDist) {
                maxDist = dist[i]; bestPath.clear(); int node = i;
                while (node != -1) { bestPath.insert(bestPath.begin(), node); node = parent[node]; }
            }
        }
    }
    return {{"diameter", maxDist}, {"path", bestPath}};
}

json computeGirth(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> adj(N);
    for (const auto& [u, v] : edgeList) { if (u >= 0 && u < N && v >= 0 && v < N) { adj[u].push_back(v); adj[v].push_back(u); } }
    int girth = INT_MAX; vector<int> girthCycle;
    for (int s = 0; s < N; s++) {
        vector<int> dist(N, -1), parent(N, -1);
        queue<int> q; dist[s] = 0; q.push(s);
        while (!q.empty()) {
            int cur = q.front(); q.pop();
            for (int neighbor : adj[cur]) {
                if (dist[neighbor] == -1) { dist[neighbor] = dist[cur]+1; parent[neighbor] = cur; q.push(neighbor); }
                else if (parent[cur] != neighbor) {
                    int cycleLen = dist[cur] + dist[neighbor] + 1;
                    if (cycleLen < girth) {
                        girth = cycleLen;
                        vector<int> p1, p2; int a = cur, b = neighbor;
                        while (a != s && a != -1) { p1.push_back(a); a = parent[a]; }
                        while (b != s && b != -1) { p2.insert(p2.begin(), b); b = parent[b]; }
                        girthCycle = p1; girthCycle.push_back(s);
                        for (int x : p2) girthCycle.push_back(x);
                    }
                }
            }
        }
    }
    if (girth == INT_MAX) return {{"girth", -1}, {"cycle", json::array()}};
    return {{"girth", girth}, {"cycle", girthCycle}};
}

// ========== TUGAS 4 ==========

json shortestPath(int N, const vector<tuple<int,int,int>>& weightedEdges, int src, int dst) {
    if (src < 0 || src >= N || dst < 0 || dst >= N) return {{"reachable", false}, {"distance", -1}, {"path", json::array()}};
    vector<vector<pair<int,int>>> adjW(N);
    for (const auto& e : weightedEdges) { int u=get<0>(e),v=get<1>(e),w=get<2>(e); adjW[u].push_back({v,w}); adjW[v].push_back({u,w}); }
    vector<int> dist(N, INT_MAX), parent(N, -1);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;
    dist[src] = 0; pq.push({0, src});
    while (!pq.empty()) { auto [d,u] = pq.top(); pq.pop(); if (d > dist[u]) continue; for (auto [v,w] : adjW[u]) { if (dist[u]+w < dist[v]) { dist[v] = dist[u]+w; parent[v] = u; pq.push({dist[v], v}); } } }
    if (dist[dst] == INT_MAX) return {{"reachable", false}, {"distance", -1}, {"path", json::array()}};
    vector<int> path; for (int cur = dst; cur != -1; cur = parent[cur]) path.push_back(cur);
    reverse(path.begin(), path.end());
    return {{"reachable", true}, {"distance", dist[dst]}, {"path", path}};
}

struct UnionFind {
    vector<int> parent, rank_;
    UnionFind(int n) : parent(n), rank_(n, 0) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) { if (parent[x] != x) parent[x] = find(parent[x]); return parent[x]; }
    bool unite(int x, int y) { int px=find(x),py=find(y); if (px==py) return false; if (rank_[px]<rank_[py]) swap(px,py); parent[py]=px; if (rank_[px]==rank_[py]) rank_[px]++; return true; }
};

json computeMST(int N, const vector<tuple<int,int,int>>& weightedEdges) {
    auto sorted_edges = weightedEdges;
    sort(sorted_edges.begin(), sorted_edges.end(), [](const auto& a, const auto& b) { return get<2>(a) < get<2>(b); });
    UnionFind uf(N); json mstEdgesJson = json::array(); int totalWeight = 0, edgeCount = 0;
    for (const auto& e : sorted_edges) { int u=get<0>(e),v=get<1>(e),w=get<2>(e); if (uf.unite(u,v)) { mstEdgesJson.push_back({u,v,w}); totalWeight+=w; edgeCount++; if (edgeCount==N-1) break; } }
    return {{"connected", edgeCount==N-1}, {"totalWeight", totalWeight}, {"mstEdges", mstEdgesJson}};
}

// ========== TUGAS 5 ==========

int candidateListSizeTSP(int n) {
    if (n > 750) return 17; if (n > 500) return 15; if (n > 100) return 10; if (n > 25) return 5; return 3;
}

vector<int> graspConstructTSP(const vector<vector<double>>& cost, int start, int n) {
    vector<int> tour; vector<bool> visited(n, false);
    tour.push_back(start); visited[start] = true; int current = start;
    while ((int)tour.size() < n) {
        vector<pair<double,int>> candidates;
        for (int v = 0; v < n; v++) { if (!visited[v] && cost[current][v] < 1e17) candidates.push_back({cost[current][v], v}); }
        if (candidates.empty()) return {};
        sort(candidates.begin(), candidates.end());
        int k = min((int)candidates.size(), candidateListSizeTSP(n));
        int pick = rand() % k; int next = candidates[pick].second;
        tour.push_back(next); visited[next] = true; current = next;
    }
    tour.push_back(start); return tour;
}

double tourCostTSP(const vector<int>& tour, const vector<vector<double>>& cost, int n) {
    double total = 0; for (int i = 0; i < n; i++) total += cost[tour[i]][tour[i+1]]; return total;
}

vector<int> twoOptTSP(const vector<int>& tour, const vector<vector<double>>& cost, int n) {
    vector<int> best = tour; bool improved = true;
    while (improved) { improved = false; for (int i=0; i<n-1; i++) for (int j=i+2; j<n; j++) { if (i==0 && j==n-1) continue; double oldC=cost[best[i]][best[i+1]]+cost[best[j]][best[j+1]]; double newC=cost[best[i]][best[j]]+cost[best[i+1]][best[j+1]]; if (newC < oldC - 1e-9) { reverse(best.begin()+i+1, best.begin()+j+1); improved=true; } } }
    return best;
}

json solveTSPGraspSwap(int N, const vector<vector<double>>& cost, int startNode, int timeLimitMs) {
    if (N <= 1) return {{"feasible", true}, {"startNode", startNode}, {"totalCost", 0}, {"tour", json::array({startNode, startNode})}, {"tourEdges", json::array()}};
    vector<int> bestTour; double bestCost = 1e18;
    auto startTime = chrono::steady_clock::now(); int iterations = 0;
    while (true) {
        auto now = chrono::steady_clock::now(); auto elapsed = chrono::duration_cast<chrono::milliseconds>(now - startTime).count();
        if (elapsed >= timeLimitMs) break;
        vector<int> tour = graspConstructTSP(cost, startNode, N);
        if (tour.empty()) { iterations++; if (iterations > 1000) break; continue; }
        tour = twoOptTSP(tour, cost, N);
        double c = tourCostTSP(tour, cost, N);
        if (c < bestCost) { bestCost = c; bestTour = tour; }
        iterations++;
    }
    if (bestTour.empty()) return {{"feasible", false}, {"startNode", startNode}, {"totalCost", -1}, {"tour", json::array()}, {"tourEdges", json::array()}};
    json tourEdgesJson = json::array();
    for (int i = 0; i < N; i++) { int u=bestTour[i], v=bestTour[i+1]; tourEdgesJson.push_back({u, v, cost[u][v]}); }
    return {{"feasible", true}, {"startNode", startNode}, {"totalCost", bestCost}, {"tour", bestTour}, {"tourEdges", tourEdgesJson}};
}

// ========== WASM Entry Point ==========

EMSCRIPTEN_KEEPALIVE
const char* processGraph(const char* inputJson) {
    static thread_local std::string resultBuffer;
    
    srand((unsigned int)chrono::steady_clock::now().time_since_epoch().count());
    
    try {
        json input = json::parse(inputJson);
        string operation = input.at("operation").get<string>();
        json result;

        if (operation == "dfs" || operation == "bfs" || operation == "check_path" || operation == "check_connectivity") {
            int numVertices = input.at("numVertices").get<int>();
            if (numVertices < 0 || numVertices > 1024) { resultBuffer = json{{"success", false}, {"error", "numVertices harus 0-1024"}}.dump(); return resultBuffer.c_str(); }
            Graph g(numVertices);
            if (input.contains("edges")) { for (auto& e : input["edges"]) { int src=e[0].get<int>(), dest=e[1].get<int>(); g.addEdge(src, dest); } }
            if (operation == "dfs") { int start = input.at("startNode").get<int>(); if (start<0||start>=numVertices) { resultBuffer = json{{"success",false},{"error","startNode diluar index"}}.dump(); return resultBuffer.c_str(); } result = json{{"success",true},{"traversal",g.DFS(start)}}; }
            else if (operation == "bfs") { int start = input.at("startNode").get<int>(); if (start<0||start>=numVertices) { resultBuffer = json{{"success",false},{"error","startNode diluar index"}}.dump(); return resultBuffer.c_str(); } result = json{{"success",true},{"traversal",g.BFS(start)}}; }
            else if (operation == "check_path") { int a=input.at("nodeA").get<int>(), b=input.at("nodeB").get<int>(); if (a<0||a>=numVertices||b<0||b>=numVertices) { resultBuffer = json{{"success",false},{"error","nodeA atau nodeB diluar index"}}.dump(); return resultBuffer.c_str(); } json pr = g.cekPath(a,b); result = json{{"success",true},{"found",pr["found"]},{"path",pr["path"]}}; }
            else if (operation == "check_connectivity") { json cr = g.cekKeterhubungan(); result = json{{"success",true},{"connected",cr["connected"]},{"reachable",cr["reachable"]},{"total",cr["total"]}}; }

        } else if (operation == "count_components" || operation == "largest_component") {
            int N = input.at("numVertices").get<int>();
            if (N < 0 || N > 1024) { resultBuffer = json{{"success",false},{"error","numVertices harus 0-1024"}}.dump(); return resultBuffer.c_str(); }
            vector<pair<int,int>> edgeList;
            if (input.contains("edges")) { for (auto& e : input["edges"]) { int u=e[0].get<int>(), v=e[1].get<int>(); if (u==v) continue; edgeList.push_back({u,v}); } }
            if (operation == "count_components") { json cr = hitungJumlahKomponen(N,(int)edgeList.size(),edgeList); result = json{{"success",true},{"count",cr["count"]},{"components",cr["components"]}}; }
            else { json cr = cariKomponenTerbesar(N,(int)edgeList.size(),edgeList); result = json{{"success",true},{"count",cr["count"]},{"components",cr["components"]},{"largestIndex",cr["largestIndex"]},{"largestSize",cr["largestSize"]},{"largestNodes",cr["largestNodes"]}}; }

        } else if (operation == "count_islands") {
            vector<string> gridRows; for (auto& row : input.at("grid")) gridRows.push_back(row.get<string>());
            if (gridRows.size()>100||(!gridRows.empty()&&gridRows[0].size()>100)) { resultBuffer = json{{"success",false},{"error","Grid terlalu besar (max 100x100)"}}.dump(); return resultBuffer.c_str(); }
            json ir = hitungJumlahIsland(gridRows); result = json{{"success",true},{"count",ir["count"]},{"labels",ir["labels"]}};

        } else if (operation == "maximum_bipartite_matching") {
            int N = input.at("numVertices").get<int>();
            if (N<0||N>1024) { resultBuffer = json{{"success",false},{"error","numVertices harus 0-1024"}}.dump(); return resultBuffer.c_str(); }
            vector<pair<int,int>> edgeList;
            if (input.contains("edges")) { for (auto& e : input["edges"]) { int u=e[0].get<int>(), v=e[1].get<int>(); if (u==v) continue; edgeList.push_back({u,v}); } }
            json r = maximumBipartiteMatching(N, edgeList);
            result = json{{"success",true},{"isBipartite",r["isBipartite"]},{"partitionA",r["partitionA"]},{"partitionB",r["partitionB"]},{"matchingSize",r["matchingSize"]},{"matchingEdges",r["matchingEdges"]},{"unmatchedA",r["unmatchedA"]},{"unmatchedB",r["unmatchedB"]}};

        } else if (operation == "check_bipartite" || operation == "check_cycle" || operation == "diameter" || operation == "girth") {
            int N = input.at("numVertices").get<int>();
            if (N<0||N>1024) { resultBuffer = json{{"success",false},{"error","numVertices harus 0-1024"}}.dump(); return resultBuffer.c_str(); }
            vector<pair<int,int>> edgeList;
            if (input.contains("edges")) { for (auto& e : input["edges"]) { int u=e[0].get<int>(), v=e[1].get<int>(); if (u==v) continue; edgeList.push_back({u,v}); } }
            if (operation=="check_bipartite") { json r=checkBipartite(N,edgeList); result=json{{"success",true},{"isBipartite",r["isBipartite"]},{"partitionA",r["partitionA"]},{"partitionB",r["partitionB"]}}; }
            else if (operation=="check_cycle") { json r=checkCycle(N,edgeList); result=json{{"success",true},{"hasCycle",r["hasCycle"]},{"cyclePath",r["cyclePath"]}}; }
            else if (operation=="diameter") { json r=computeDiameter(N,edgeList); result=json{{"success",true},{"diameter",r["diameter"]},{"path",r["path"]}}; }
            else { json r=computeGirth(N,edgeList); result=json{{"success",true},{"girth",r["girth"]},{"cycle",r["cycle"]}}; }

        } else if (operation == "shortest_path") {
            int N=input.at("numVertices").get<int>(); if (N<=0||N>1024) { resultBuffer = json{{"success",false},{"error","numVertices harus 1-1024"}}.dump(); return resultBuffer.c_str(); }
            int a=input.at("nodeA").get<int>(), b=input.at("nodeB").get<int>(); if (a<0||a>=N||b<0||b>=N) { resultBuffer = json{{"success",false},{"error","nodeA atau nodeB diluar index"}}.dump(); return resultBuffer.c_str(); }
            vector<tuple<int,int,int>> weightedEdges;
            if (input.contains("edges")) { for (auto& e : input["edges"]) { int u=e[0].get<int>(), v=e[1].get<int>(), w=(int)e.size()>=3?e[2].get<int>():1; if (u==v||w<0) continue; weightedEdges.push_back({u,v,w}); } }
            json spResult = shortestPath(N,weightedEdges,a,b); result=json{{"success",true},{"reachable",spResult["reachable"]},{"distance",spResult["distance"]},{"path",spResult["path"]}};

        } else if (operation == "min_spanning_tree") {
            int N=input.at("numVertices").get<int>(); if (N<=0||N>1024) { resultBuffer = json{{"success",false},{"error","numVertices harus 1-1024"}}.dump(); return resultBuffer.c_str(); }
            vector<tuple<int,int,int>> weightedEdges;
            if (input.contains("edges")) { for (auto& e : input["edges"]) { int u=e[0].get<int>(), v=e[1].get<int>(), w=(int)e.size()>=3?e[2].get<int>():1; if (u==v||w<0) continue; weightedEdges.push_back({u,v,w}); } }
            json mstResult = computeMST(N,weightedEdges); result=json{{"success",true},{"connected",mstResult["connected"]},{"totalWeight",mstResult["totalWeight"]},{"mstEdges",mstResult["mstEdges"]}};

        } else if (operation == "tsp_grasp_swap") {
            string mode = input.value("mode","edge"); int startNode = input.value("startNode",0); int timeLimitMs = input.value("timeLimitMs",5000);
            if (timeLimitMs<100) timeLimitMs=100; if (timeLimitMs>9000) timeLimitMs=9000;
            vector<vector<double>> cost; int N=0;
            if (mode == "coordinate") {
                auto coords = input.at("coordinates"); N=(int)coords.size();
                if (N<=0||N>1024) { resultBuffer = json{{"success",false},{"error","TSP coordinate mode harus 1-1024 node"}}.dump(); return resultBuffer.c_str(); }
                cost.assign(N, vector<double>(N, 0.0));
                for (int i=0;i<N;i++) { double xi=coords[i]["x"].get<double>(), yi=coords[i]["y"].get<double>(); for (int j=i+1;j<N;j++) { double xj=coords[j]["x"].get<double>(), yj=coords[j]["y"].get<double>(); double d=sqrt((xi-xj)*(xi-xj)+(yi-yj)*(yi-yj)); cost[i][j]=d; cost[j][i]=d; } }
            } else {
                N=input.at("numVertices").get<int>();
                if (N<=0||N>1024) { resultBuffer = json{{"success",false},{"error","numVertices untuk TSP harus 1-1024"}}.dump(); return resultBuffer.c_str(); }
                cost.assign(N, vector<double>(N, 1e18)); for (int i=0;i<N;i++) cost[i][i]=0.0;
                if (input.contains("edges")) { for (auto& e : input["edges"]) { int u=e[0].get<int>(), v=e[1].get<int>(); double w=(int)e.size()>=3?e[2].get<double>():1.0; if (u==v||w<0||u<0||u>=N||v<0||v>=N) continue; cost[u][v]=min(cost[u][v],w); cost[v][u]=min(cost[v][u],w); } }
            }
            if (startNode<0||startNode>=N) startNode=0;
            json tspResult = solveTSPGraspSwap(N, cost, startNode, timeLimitMs);
            result = json{{"success",true},{"feasible",tspResult["feasible"]},{"startNode",tspResult["startNode"]},{"totalCost",tspResult["totalCost"]},{"tour",tspResult["tour"]},{"tourEdges",tspResult["tourEdges"]}};

        } else {
            result = json{{"success", false}, {"error", "Operasi tidak dikenal: " + operation}};
        }

        resultBuffer = result.dump();
        return resultBuffer.c_str();

    } catch (const json::exception& e) {
        resultBuffer = json{{"success", false}, {"error", string("JSON parse error: ") + e.what()}}.dump();
        return resultBuffer.c_str();
    } catch (const exception& e) {
        resultBuffer = json{{"success", false}, {"error", string("Error: ") + e.what()}}.dump();
        return resultBuffer.c_str();
    }
}

} // extern "C"
