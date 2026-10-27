#include <algorithm>
#include <deque>
#include <fstream>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using namespace std;
using i128 = __int128_t;

struct Line {
    long long slope;
    i128 intercept;
    int state;
};

string toString(i128 value) {
    if (value == 0) return "0";
    bool negative = value < 0;
    if (negative) value = -value;
    string digits;
    while (value > 0) {
        digits.push_back(char('0' + value % 10));
        value /= 10;
    }
    if (negative) digits.push_back('-');
    reverse(digits.begin(), digits.end());
    return digits;
}

i128 evaluate(const Line& line, long long x) {
    return i128(line.slope) * x + line.intercept;
}

// Slopes decrease and future query coordinates never decrease.
bool obsolete(const Line& left, const Line& middle, const Line& right) {
    return (middle.intercept - left.intercept) * (middle.slope - right.slope)
        >= (right.intercept - middle.intercept) * (left.slope - middle.slope);
}

int main() {
    ifstream input("input.txt");
    if (!input) {
        cerr << "Cannot open input.txt\n";
        return 1;
    }

    int n;
    long long setup;
    if (!(input >> n >> setup) || n < 1 || n > 5000 || setup < 0 || setup > 10000000) {
        cerr << "Invalid n or S\n";
        return 1;
    }

    vector<long long> timePrefix(n + 1);
    vector<long long> feePrefix(n + 1);
    for (int i = 1; i <= n; ++i) {
        long long time, fee;
        if (!(input >> time >> fee) || time < 0 || fee < 0
            || time > 10000000 || fee > 10000000) {
            cerr << "Invalid job data\n";
            return 1;
        }
        timePrefix[i] = timePrefix[i - 1] + time;
        feePrefix[i] = feePrefix[i - 1] + fee;
    }

    const long long totalFee = feePrefix[n];
    vector<i128> dp(n + 1);
    vector<int> previous(n + 1);
    deque<Line> hull{{0, 0, 0}};

    for (int i = 1; i <= n; ++i) {
        const long long x = setup + timePrefix[i];
        while (hull.size() >= 2 && evaluate(hull[1], x) < evaluate(hull[0], x)) {
            hull.pop_front();
        }

        previous[i] = hull.front().state;
        dp[i] = i128(x) * totalFee + evaluate(hull.front(), x);
        const Line candidate{
            -feePrefix[i],
            dp[i] - i128(timePrefix[i]) * (totalFee - feePrefix[i]),
            i
        };

        // For equal slopes keep the lower intercept, preferring the older
        // state on ties so that reconstruction is deterministic.
        if (!hull.empty() && hull.back().slope == candidate.slope) {
            if (hull.back().intercept <= candidate.intercept) continue;
            hull.pop_back();
        }
        while (hull.size() >= 2 && obsolete(hull[hull.size() - 2], hull.back(), candidate)) {
            hull.pop_back();
        }
        hull.push_back(candidate);
    }

    ofstream output("output.txt");
    if (!output) {
        cerr << "Cannot open output.txt\n";
        return 1;
    }
    output << toString(dp[n]) << '\n';

    vector<pair<int, int>> groups;
    for (int i = n; i > 0; i = previous[i]) {
        groups.push_back({previous[i] + 1, i});
    }
    reverse(groups.begin(), groups.end());
    cerr << "Optimal batches: ";
    for (auto [first, last] : groups) cerr << '[' << first << ',' << last << "] ";
    cerr << "\nCost: " << toString(dp[n]) << '\n';
    return 0;
}