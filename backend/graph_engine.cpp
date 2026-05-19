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
#include <tuple>
#include <cmath>
#include <chrono>
#include <cstdlib>
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

// Maximum Bipartite Matching using Hopcroft-Karp
json maximumBipartiteMatching(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> localAdj(N);
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N) {
            localAdj[u].push_back(v);
            localAdj[v].push_back(u);
        }
    }

    vector<int> color(N, -1);
    vector<int> partitionA;
    vector<int> partitionB;

    for (int start = 0; start < N; start++) {
        if (color[start] != -1) continue;

        queue<int> q;
        q.push(start);
        color[start] = 0;

        while (!q.empty()) {
            int u = q.front();
            q.pop();

            for (int v : localAdj[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];
                    q.push(v);
                } else if (color[v] == color[u]) {
                    return json{
                        {"isBipartite", false},
                        {"partitionA", json::array()},
                        {"partitionB", json::array()},
                        {"matchingSize", 0},
                        {"matchingEdges", json::array()},
                        {"unmatchedA", json::array()},
                        {"unmatchedB", json::array()}
                    };
                }
            }
        }
    }

    for (int i = 0; i < N; i++) {
        if (color[i] == 0) partitionA.push_back(i);
        else if (color[i] == 1) partitionB.push_back(i);
    }

    vector<int> pairU(N, -1);
    vector<int> pairV(N, -1);
    vector<int> dist(N, INT_MAX);

    auto bfs = [&]() {
        queue<int> q;
        bool foundFreeRight = false;

        for (int u : partitionA) {
            if (pairU[u] == -1) {
                dist[u] = 0;
                q.push(u);
            } else {
                dist[u] = INT_MAX;
            }
        }

        while (!q.empty()) {
            int u = q.front();
            q.pop();

            for (int v : localAdj[u]) {
                if (color[v] != 1) continue;

                int matchedU = pairV[v];
                if (matchedU == -1) {
                    foundFreeRight = true;
                } else if (dist[matchedU] == INT_MAX) {
                    dist[matchedU] = dist[u] + 1;
                    q.push(matchedU);
                }
            }
        }

        return foundFreeRight;
    };

    function<bool(int)> dfs = [&](int u) {
        for (int v : localAdj[u]) {
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
        for (int u : partitionA) {
            if (pairU[u] == -1 && dfs(u)) {
                matchingSize++;
            }
        }
    }

    json matchingEdges = json::array();
    json unmatchedA = json::array();
    json unmatchedB = json::array();

    for (int u : partitionA) {
        if (pairU[u] == -1) unmatchedA.push_back(u);
        else matchingEdges.push_back({u, pairU[u]});
    }
    for (int v : partitionB) {
        if (pairV[v] == -1) unmatchedB.push_back(v);
    }

    return json{
        {"isBipartite", true},
        {"partitionA", partitionA},
        {"partitionB", partitionB},
        {"matchingSize", matchingSize},
        {"matchingEdges", matchingEdges},
        {"unmatchedA", unmatchedA},
        {"unmatchedB", unmatchedB}
    };
}

struct TimetableEdge {
    int teacher;
    int classId;
    int color;
    int id;
};

json solveTimetabling(int teacherCount, int classCount, const vector<vector<int>>& requirements, int roomLimit) {
    vector<int> teacherLoads(teacherCount, 0);
    vector<int> classLoads(classCount, 0);
    vector<TimetableEdge> edges;
    int totalLessons = 0;

    for (int i = 0; i < teacherCount; i++) {
        for (int j = 0; j < classCount; j++) {
            int need = requirements[i][j];
            teacherLoads[i] += need;
            classLoads[j] += need;
            for (int r = 0; r < need; r++) {
                edges.push_back({i, j, -1, (int)edges.size()});
            }
            totalLessons += need;
        }
    }

    int delta = 0;
    for (int load : teacherLoads) delta = max(delta, load);
    for (int load : classLoads) delta = max(delta, load);

    int periodCount = delta;
    if (roomLimit > 0 && totalLessons > 0) {
        periodCount = max(delta, (totalLessons + roomLimit - 1) / roomLimit);
    }

    if (totalLessons == 0) {
        json response = {
            {"success", true},
            {"periodCount", 0},
            {"delta", delta},
            {"totalLessons", totalLessons},
            {"teacherLoads", teacherLoads},
            {"classLoads", classLoads},
            {"assignments", json::array()},
            {"periodSizes", json::array()}
        };
        if (roomLimit > 0) response["roomLimit"] = roomLimit;
        return response;
    }

    vector<vector<int>> teacherColor(teacherCount, vector<int>(periodCount, -1));
    vector<vector<int>> classColor(classCount, vector<int>(periodCount, -1));

    auto assignColor = [&](int edgeId, int color) {
        TimetableEdge& e = edges[edgeId];
        e.color = color;
        teacherColor[e.teacher][color] = edgeId;
        classColor[e.classId][color] = edgeId;
    };

    auto firstFreeTeacher = [&](int teacher) {
        for (int c = 0; c < periodCount; c++) {
            if (teacherColor[teacher][c] == -1) return c;
        }
        return -1;
    };

    auto firstFreeClass = [&](int classId) {
        for (int c = 0; c < periodCount; c++) {
            if (classColor[classId][c] == -1) return c;
        }
        return -1;
    };

    for (int edgeId = 0; edgeId < (int)edges.size(); edgeId++) {
        int teacher = edges[edgeId].teacher;
        int classId = edges[edgeId].classId;
        int directColor = -1;

        for (int color = 0; color < periodCount; color++) {
            if (teacherColor[teacher][color] == -1 && classColor[classId][color] == -1) {
                directColor = color;
                break;
            }
        }

        if (directColor != -1) {
            assignColor(edgeId, directColor);
            continue;
        }

        int alpha = firstFreeTeacher(teacher);
        int beta = firstFreeClass(classId);
        if (alpha == -1 || beta == -1) {
            return json{{"success", false}, {"error", "Tidak ada warna bebas untuk alternating path"}};
        }

        vector<int> pathEdges;
        int side = 1; // 0 = teacher, 1 = class
        int vertex = classId;
        int color = alpha;

        while (true) {
            int nextEdge = side == 0 ? teacherColor[vertex][color] : classColor[vertex][color];
            if (nextEdge == -1) break;
            pathEdges.push_back(nextEdge);

            const TimetableEdge& e = edges[nextEdge];
            if (side == 0) {
                side = 1;
                vertex = e.classId;
            } else {
                side = 0;
                vertex = e.teacher;
            }
            color = (color == alpha) ? beta : alpha;
        }

        vector<pair<int, int>> recolor;
        for (int pathEdge : pathEdges) {
            TimetableEdge& e = edges[pathEdge];
            int oldColor = e.color;
            int newColor = (oldColor == alpha) ? beta : alpha;
            teacherColor[e.teacher][oldColor] = -1;
            classColor[e.classId][oldColor] = -1;
            recolor.push_back({pathEdge, newColor});
        }
        for (auto [pathEdge, newColor] : recolor) {
            TimetableEdge& e = edges[pathEdge];
            e.color = newColor;
            teacherColor[e.teacher][newColor] = pathEdge;
            classColor[e.classId][newColor] = pathEdge;
        }

        assignColor(edgeId, alpha);
    }

    vector<int> periodSizes(periodCount, 0);
    auto recomputePeriodSizes = [&]() {
        fill(periodSizes.begin(), periodSizes.end(), 0);
        for (const auto& e : edges) {
            if (e.color >= 0) periodSizes[e.color]++;
        }
    };
    recomputePeriodSizes();

    auto rebalancePair = [&](int highColor, int lowColor) {
        int vertexCount = teacherCount + classCount;
        vector<vector<int>> incident(vertexCount);
        for (const auto& e : edges) {
            if (e.color == highColor || e.color == lowColor) {
                incident[e.teacher].push_back(e.id);
                incident[teacherCount + e.classId].push_back(e.id);
            }
        }

        vector<char> visited(edges.size(), 0);
        for (const auto& startEdge : edges) {
            if (visited[startEdge.id] || (startEdge.color != highColor && startEdge.color != lowColor)) continue;

            vector<int> componentEdges;
            queue<int> q;
            q.push(startEdge.id);
            visited[startEdge.id] = 1;

            while (!q.empty()) {
                int edgeId = q.front();
                q.pop();
                componentEdges.push_back(edgeId);

                const TimetableEdge& e = edges[edgeId];
                int a = e.teacher;
                int b = teacherCount + e.classId;
                for (int vertexId : {a, b}) {
                    for (int nextEdge : incident[vertexId]) {
                        if (!visited[nextEdge]) {
                            visited[nextEdge] = 1;
                            q.push(nextEdge);
                        }
                    }
                }
            }

            int highCount = 0;
            int lowCount = 0;
            for (int edgeId : componentEdges) {
                if (edges[edgeId].color == highColor) highCount++;
                else lowCount++;
            }

            if (highCount > lowCount) {
                for (int edgeId : componentEdges) {
                    edges[edgeId].color = edges[edgeId].color == highColor ? lowColor : highColor;
                }
                recomputePeriodSizes();
                return true;
            }
        }

        return false;
    };

    if (roomLimit > 0) {
        int guard = max(1, totalLessons * max(1, periodCount));
        while (guard-- > 0) {
            int highColor = 0;
            int lowColor = 0;
            for (int c = 1; c < periodCount; c++) {
                if (periodSizes[c] > periodSizes[highColor]) highColor = c;
                if (periodSizes[c] < periodSizes[lowColor]) lowColor = c;
            }

            if (periodSizes[highColor] <= periodSizes[lowColor] + 1) break;
            if (!rebalancePair(highColor, lowColor)) {
                return json{{"success", false}, {"error", "Balancing Lemma 6.3 gagal menemukan komponen penukar"}};
            }
        }
    }

    vector<int> order(edges.size());
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int a, int b) {
        const auto& ea = edges[a];
        const auto& eb = edges[b];
        if (ea.color != eb.color) return ea.color < eb.color;
        if (ea.teacher != eb.teacher) return ea.teacher < eb.teacher;
        if (ea.classId != eb.classId) return ea.classId < eb.classId;
        return ea.id < eb.id;
    });

    json assignments = json::array();
    for (int edgeId : order) {
        const auto& e = edges[edgeId];
        assignments.push_back({
            {"teacher", e.teacher},
            {"class", e.classId},
            {"period", e.color},
            {"edgeId", e.id}
        });
    }

    json response = {
        {"success", true},
        {"periodCount", periodCount},
        {"delta", delta},
        {"totalLessons", totalLessons},
        {"teacherLoads", teacherLoads},
        {"classLoads", classLoads},
        {"assignments", assignments},
        {"periodSizes", periodSizes}
    };
    if (roomLimit > 0) response["roomLimit"] = roomLimit;
    return response;
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

int bandwidthForOrder(int N, const vector<pair<int,int>>& edgeList, const vector<int>& order) {
    vector<int> pos(N, 0);
    for (int i = 0; i < N; i++) pos[order[i]] = i;

    int bandwidth = 0;
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u < 0 || u >= N || v < 0 || v >= N || u == v) continue;
        bandwidth = max(bandwidth, abs(pos[u] - pos[v]));
    }
    return bandwidth;
}

vector<vector<int>> bandwidthCriticalEdges(int N, const vector<pair<int,int>>& edgeList, const vector<int>& order, int bandwidth) {
    vector<int> pos(N, 0);
    for (int i = 0; i < N; i++) pos[order[i]] = i;

    vector<vector<int>> criticalEdges;
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u < 0 || u >= N || v < 0 || v >= N || u == v) continue;
        int width = abs(u - v);
        width = abs(pos[u] - pos[v]);
        if (width == bandwidth) {
            criticalEdges.push_back({u, v});
        }
    }
    return criticalEdges;
}

vector<int> cuthillMckeeOrder(int N, const vector<pair<int,int>>& edgeList) {
    vector<vector<int>> localAdj(N);
    for (auto& e : edgeList) {
        int u = e.first;
        int v = e.second;
        if (u >= 0 && u < N && v >= 0 && v < N && u != v) {
            localAdj[u].push_back(v);
            localAdj[v].push_back(u);
        }
    }

    vector<int> degree(N);
    for (int i = 0; i < N; i++) {
        sort(localAdj[i].begin(), localAdj[i].end());
        localAdj[i].erase(unique(localAdj[i].begin(), localAdj[i].end()), localAdj[i].end());
        degree[i] = (int)localAdj[i].size();
    }

    vector<bool> visited(N, false);
    vector<int> order;
    order.reserve(N);

    while ((int)order.size() < N) {
        int start = -1;
        for (int i = 0; i < N; i++) {
            if (!visited[i] && (start == -1 || degree[i] < degree[start] || (degree[i] == degree[start] && i < start))) {
                start = i;
            }
        }

        queue<int> q;
        visited[start] = true;
        q.push(start);

        while (!q.empty()) {
            int u = q.front();
            q.pop();
            order.push_back(u);

            vector<int> neighbors;
            for (int v : localAdj[u]) {
                if (!visited[v]) neighbors.push_back(v);
            }
            sort(neighbors.begin(), neighbors.end(), [&](int a, int b) {
                if (degree[a] != degree[b]) return degree[a] < degree[b];
                return a < b;
            });
            for (int v : neighbors) {
                visited[v] = true;
                q.push(v);
            }
        }
    }

    return order;
}

// Minimize graph bandwidth: exact for small graphs, RCM heuristic for larger graphs.
json computeBandwidth(int N, const vector<pair<int,int>>& edgeList) {
    vector<int> initialOrder(N);
    iota(initialOrder.begin(), initialOrder.end(), 0);
    int initialBandwidth = bandwidthForOrder(N, edgeList, initialOrder);

    vector<int> bestOrder = initialOrder;
    int bestBandwidth = initialBandwidth;
    vector<vector<int>> steps;
    steps.push_back(initialOrder);
    bool isOptimal = N <= 9;
    string method = isOptimal ? "exact_bruteforce" : "reverse_cuthill_mckee";

    if (isOptimal) {
        vector<int> perm = initialOrder;
        do {
            int bw = bandwidthForOrder(N, edgeList, perm);
            if (bw < bestBandwidth) {
                bestBandwidth = bw;
                bestOrder = perm;
                if ((int)steps.size() < 24) steps.push_back(bestOrder);
                if (bestBandwidth == 0) break;
            }
        } while (next_permutation(perm.begin(), perm.end()));
    } else {
        vector<int> cm = cuthillMckeeOrder(N, edgeList);
        vector<int> rcm = cm;
        reverse(rcm.begin(), rcm.end());
        int cmBandwidth = bandwidthForOrder(N, edgeList, cm);
        int rcmBandwidth = bandwidthForOrder(N, edgeList, rcm);

        steps.push_back(cm);
        steps.push_back(rcm);
        if (cmBandwidth < bestBandwidth) {
            bestBandwidth = cmBandwidth;
            bestOrder = cm;
        }
        if (rcmBandwidth < bestBandwidth) {
            bestBandwidth = rcmBandwidth;
            bestOrder = rcm;
        }
    }

    vector<int> positions(N, 0);
    for (int i = 0; i < N; i++) positions[bestOrder[i]] = i;
    if (steps.empty() || steps.back() != bestOrder) steps.push_back(bestOrder);

    return json{
        {"bandwidth", bestBandwidth},
        {"initialBandwidth", initialBandwidth},
        {"bandwidthEdges", bandwidthCriticalEdges(N, edgeList, bestOrder, bestBandwidth)},
        {"bandwidthOrder", bestOrder},
        {"bandwidthPositions", positions},
        {"bandwidthSteps", steps},
        {"isOptimal", isOptimal},
        {"method", method}
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

// ========== TUGAS 5 ==========

int candidateListSizeTSP(int n) {
    if (n > 750) return 17;
    if (n > 500) return 15;
    if (n > 100) return 10;
    if (n > 25) return 5;
    return 3;
}

vector<int> graspConstructTSP(const vector<vector<double>>& cost, int start, int n) {
    vector<int> tour;
    vector<bool> visited(n, false);
    tour.push_back(start);
    visited[start] = true;
    int current = start;

    while ((int)tour.size() < n) {
        vector<pair<double, int>> candidates;
        for (int v = 0; v < n; v++) {
            if (!visited[v] && cost[current][v] < 1e17) {
                candidates.push_back({cost[current][v], v});
            }
        }
        if (candidates.empty()) {
            return {};
        }
        sort(candidates.begin(), candidates.end());
        int k = min((int)candidates.size(), candidateListSizeTSP(n));
        int pick = rand() % k;
        int next = candidates[pick].second;
        tour.push_back(next);
        visited[next] = true;
        current = next;
    }
    tour.push_back(start);
    return tour;
}

double tourCostTSP(const vector<int>& tour, const vector<vector<double>>& cost, int n) {
    double total = 0;
    for (int i = 0; i < n; i++) {
        total += cost[tour[i]][tour[i + 1]];
    }
    return total;
}

vector<int> twoOptTSP(const vector<int>& tour, const vector<vector<double>>& cost, int n) {
    vector<int> best = tour;
    bool improved = true;
    while (improved) {
        improved = false;
        for (int i = 0; i < n - 1; i++) {
            for (int j = i + 2; j < n; j++) {
                if (i == 0 && j == n - 1) continue;
                double oldCost = cost[best[i]][best[i + 1]] + cost[best[j]][best[j + 1]];
                double newCost = cost[best[i]][best[j]] + cost[best[i + 1]][best[j + 1]];
                if (newCost < oldCost - 1e-9) {
                    reverse(best.begin() + i + 1, best.begin() + j + 1);
                    improved = true;
                }
            }
        }
    }
    return best;
}

json solveTSPGraspSwap(int N, const vector<vector<double>>& cost, int startNode, int timeLimitMs) {
    if (N <= 1) {
        return json{
            {"feasible", true},
            {"startNode", startNode},
            {"totalCost", 0},
            {"tour", json::array({startNode, startNode})},
            {"tourEdges", json::array()}
        };
    }

    vector<int> bestTour;
    double bestCost = 1e18;

    auto startTime = chrono::steady_clock::now();
    int iterations = 0;

    while (true) {
        auto now = chrono::steady_clock::now();
        auto elapsed = chrono::duration_cast<chrono::milliseconds>(now - startTime).count();
        if (elapsed >= timeLimitMs) break;

        vector<int> tour = graspConstructTSP(cost, startNode, N);
        if (tour.empty()) {
            iterations++;
            if (iterations > 1000) break;
            continue;
        }
        tour = twoOptTSP(tour, cost, N);
        double c = tourCostTSP(tour, cost, N);
        if (c < bestCost) {
            bestCost = c;
            bestTour = tour;
        }
        iterations++;
    }

    if (bestTour.empty()) {
        return json{
            {"feasible", false},
            {"startNode", startNode},
            {"totalCost", -1},
            {"tour", json::array()},
            {"tourEdges", json::array()}
        };
    }

    json tourEdgesJson = json::array();
    for (int i = 0; i < N; i++) {
        int u = bestTour[i];
        int v = bestTour[i + 1];
        tourEdgesJson.push_back({u, v, cost[u][v]});
    }

    return json{
        {"feasible", true},
        {"startNode", startNode},
        {"totalCost", bestCost},
        {"tour", bestTour},
        {"tourEdges", tourEdgesJson}
    };
}

// ========== Main: Read JSON from stdin, dispatch, write JSON to stdout ==========

int main() {
    srand((unsigned int)chrono::steady_clock::now().time_since_epoch().count());
    try {
        json input;
        cin >> input;

        string operation = input.at("operation").get<string>();
        json result;

        // ===== TUGAS 1: menggunakan class Graph =====
        if (operation == "dfs" || operation == "bfs" || operation == "check_path" ||
            operation == "check_connectivity") {

            int numVertices = input.at("numVertices").get<int>();
            if (numVertices < 0 || numVertices > 1024) {
                cout << json{{"success", false}, {"error", "numVertices harus 0-1024"}}.dump() << endl;
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
            if (N < 0 || N > 1000) {
                cout << json{{"success", false}, {"error", "numVertices harus 0-1024"}}.dump() << endl;
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

        // ===== TUGAS 3 & 7: structural graph metrics =====
        } else if (operation == "check_bipartite" || operation == "check_cycle" || operation == "diameter" || operation == "girth" || operation == "bandwidth") {

            int N = input.at("numVertices").get<int>();
            if (N < 0 || N > 1000) {
                cout << json{{"success", false}, {"error", "numVertices harus 0-1024"}}.dump() << endl;
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
            } else if (operation == "bandwidth") {
                json bres = computeBandwidth(N, edgeList);
                result = json{
                    {"success", true},
                    {"bandwidth", bres["bandwidth"]},
                    {"initialBandwidth", bres["initialBandwidth"]},
                    {"bandwidthEdges", bres["bandwidthEdges"]},
                    {"bandwidthOrder", bres["bandwidthOrder"]},
                    {"bandwidthPositions", bres["bandwidthPositions"]},
                    {"bandwidthSteps", bres["bandwidthSteps"]},
                    {"isOptimal", bres["isOptimal"]},
                    {"method", bres["method"]}
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

        } else if (operation == "maximum_bipartite_matching") {
            int N = input.at("numVertices").get<int>();
            if (N < 0 || N > 1024) {
                cout << json{{"success", false}, {"error", "numVertices harus 0-1024"}}.dump() << endl;
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

            json matchingResult = maximumBipartiteMatching(N, edgeList);
            result = json{
                {"success", true},
                {"isBipartite", matchingResult["isBipartite"]},
                {"partitionA", matchingResult["partitionA"]},
                {"partitionB", matchingResult["partitionB"]},
                {"matchingSize", matchingResult["matchingSize"]},
                {"matchingEdges", matchingResult["matchingEdges"]},
                {"unmatchedA", matchingResult["unmatchedA"]},
                {"unmatchedB", matchingResult["unmatchedB"]}
            };

        } else if (operation == "timetabling_edge_coloring") {
            int teacherCount = input.at("teacherCount").get<int>();
            int classCount = input.at("classCount").get<int>();
            if (teacherCount <= 0 || classCount <= 0 || teacherCount + classCount > 1024) {
                cout << json{{"success", false}, {"error", "Jumlah guru + kelas harus 1-1024"}}.dump() << endl;
                return 0;
            }

            if (!input.contains("requirements") || !input["requirements"].is_array() || (int)input["requirements"].size() != teacherCount) {
                cout << json{{"success", false}, {"error", "Matrix requirements tidak sesuai jumlah guru"}}.dump() << endl;
                return 0;
            }

            vector<vector<int>> requirements(teacherCount, vector<int>(classCount, 0));
            long long totalLessons = 0;
            for (int i = 0; i < teacherCount; i++) {
                if (!input["requirements"][i].is_array() || (int)input["requirements"][i].size() != classCount) {
                    cout << json{{"success", false}, {"error", "Matrix requirements tidak sesuai jumlah kelas"}}.dump() << endl;
                    return 0;
                }
                for (int j = 0; j < classCount; j++) {
                    int value = input["requirements"][i][j].get<int>();
                    if (value < 0) {
                        cout << json{{"success", false}, {"error", "Nilai p_ij tidak boleh negatif"}}.dump() << endl;
                        return 0;
                    }
                    requirements[i][j] = value;
                    totalLessons += value;
                }
            }

            if (totalLessons > 100000) {
                cout << json{{"success", false}, {"error", "Total kebutuhan mengajar terlalu besar (max 100000)"}}.dump() << endl;
                return 0;
            }

            int roomLimit = input.value("roomLimit", 0);
            if (roomLimit < 0) {
                cout << json{{"success", false}, {"error", "Kapasitas ruangan tidak boleh negatif"}}.dump() << endl;
                return 0;
            }

            result = solveTimetabling(teacherCount, classCount, requirements, roomLimit);

        } else if (operation == "shortest_path") {
            int N = input.at("numVertices").get<int>();
            if (N <= 0 || N > 1000) {
                cout << json{{"success", false}, {"error", "numVertices harus 1-1024"}}.dump() << endl;
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
            if (N <= 0 || N > 1000) {
                cout << json{{"success", false}, {"error", "numVertices harus 1-1024"}}.dump() << endl;
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

        } else if (operation == "tsp_grasp_swap") {
            string mode = input.value("mode", "edge");
            int startNode = input.value("startNode", 0);
            int timeLimitMs = input.value("timeLimitMs", 5000);
            if (timeLimitMs < 100) timeLimitMs = 100;
            if (timeLimitMs > 9000) timeLimitMs = 9000;

            vector<vector<double>> cost;
            int N = 0;

            if (mode == "coordinate") {
                auto coords = input.at("coordinates");
                N = (int)coords.size();
                if (N <= 0 || N > 1024) {
                    cout << json{{"success", false}, {"error", "TSP coordinate mode harus 1-1024 node"}}.dump() << endl;
                    return 0;
                }
                cost.assign(N, vector<double>(N, 0.0));
                for (int i = 0; i < N; i++) {
                    double xi = coords[i]["x"].get<double>();
                    double yi = coords[i]["y"].get<double>();
                    for (int j = i + 1; j < N; j++) {
                        double xj = coords[j]["x"].get<double>();
                        double yj = coords[j]["y"].get<double>();
                        double d = sqrt((xi - xj) * (xi - xj) + (yi - yj) * (yi - yj));
                        cost[i][j] = d;
                        cost[j][i] = d;
                    }
                }
            } else {
                N = input.at("numVertices").get<int>();
                if (N <= 0 || N > 1024) {
                    cout << json{{"success", false}, {"error", "numVertices untuk TSP harus 1-1024"}}.dump() << endl;
                    return 0;
                }
                cost.assign(N, vector<double>(N, 1e18));
                for (int i = 0; i < N; i++) cost[i][i] = 0.0;

                if (input.contains("edges")) {
                    for (auto& e : input["edges"]) {
                        int u = e[0].get<int>();
                        int v = e[1].get<int>();
                        double w = (int)e.size() >= 3 ? e[2].get<double>() : 1.0;
                        if (u == v) continue;
                        if (w < 0) continue;
                        if (u < 0 || u >= N || v < 0 || v >= N) continue;
                        cost[u][v] = min(cost[u][v], w);
                        cost[v][u] = min(cost[v][u], w);
                    }
                }
            }

            if (startNode < 0 || startNode >= N) startNode = 0;

            json tspResult = solveTSPGraspSwap(N, cost, startNode, timeLimitMs);
            result = json{
                {"success", true},
                {"feasible", tspResult["feasible"]},
                {"startNode", tspResult["startNode"]},
                {"totalCost", tspResult["totalCost"]},
                {"tour", tspResult["tour"]},
                {"tourEdges", tspResult["tourEdges"]}
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
