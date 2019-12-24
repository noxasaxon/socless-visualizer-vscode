"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Viz = require("viz.js");
const { Module, render } = require("viz.js/full.render.js");
let viz = new Viz({ Module, render });
function color_task_failure_steps(stepFunction) {
    const step_names = Object.keys(stepFunction.States);
    let failure_steps_colors = "";
    step_names.forEach(state_name => {
        const result = state_name.match(/_task_fail|end_with_failure/i);
        if (result) {
            console.log(result.input);
            failure_steps_colors += `\n "${result.input}" [style=filled, fillcolor="#faa000"];`;
        }
    });
    return failure_steps_colors;
}
function buildTransitions(stepFunction) {
    const transitions = [];
    const step_state_names = Object.keys(stepFunction.States);
    const subgraphData = makeSubgraph(step_state_names);
    step_state_names.map(stateName => {
        const state = stepFunction.States[stateName];
        if (state.Type === "Parallel") {
            const parallelTransitions = [];
            state.Branches.forEach(branch => {
                transitions.push(makeTransition(stateName, branch.StartAt));
                const { subgraph } = wrapInBranchCluster(buildTransitions(branch).subgraph, "Branch");
                parallelTransitions.push(subgraph);
            });
            const parallelBranchesSubgraphData = wrapInParallelCluster(parallelTransitions.join("\n"), "Parallel block");
            transitions.push(parallelBranchesSubgraphData.subgraph);
            transitions.push(makeTransition(state.Branches[0].StartAt, state.Next, parallelBranchesSubgraphData.subgraphName));
        }
        if (state.Next && state.Type !== "Parallel") {
            transitions.push(makeTransition(stateName, state.Next));
        }
        if (state.Catch) {
            state.Catch.forEach((item) => {
                transitions.push(makeCatchTransition(stateName, item.Next));
            });
        }
        if (state.Choices) {
            state.Choices.forEach(choice => {
                transitions.push(makeTransition(stateName, choice.Next));
            });
            if (state.Default) {
                transitions.push(makeTransition(stateName, state.Default));
            }
            // const subgraphNames = state.Choices.map(choice => choice.Next);
            // if (state.Default) {
            //   subgraphNames.push(state.Default);
            // }
            // const subgraphGroup = makeChoicesSubgraph(subgraphNames, "Choice");
            // transitions.push(subgraphGroup);
        }
        if (!state.Next && state.End) {
            transitions.push(`"${stateName}";`);
        }
    });
    return {
        subgraph: transitions.join("\n"),
        subgraphName: subgraphData.subgraphName
    };
}
function getEndStateName(stepFunction) {
    return Object.keys(stepFunction.States).find(stateName => {
        const state = stepFunction.States[stateName];
        return !!state.End || state.Type === "Fail";
    });
}
function wrapInCluster(str, label = "") {
    const subgraphName = `cluster_${((Math.random() * 10000) ^ 0) + ""}`;
    const subgraph = `
    subgraph ${subgraphName} {
        label = "${label}";
        ${str}
    }`;
    return {
        subgraph,
        subgraphName
    };
}
function wrapInParallelCluster(str, label = "") {
    const innerStr = `
    style=dashed;
    ${str}`;
    return wrapInCluster(innerStr, label);
}
function wrapInBranchCluster(str, label = "") {
    const innerStr = `
    style=rounded;
    ${str}`;
    return wrapInCluster(innerStr, label);
}
// function makeChoicesSubgraph(statesNames: string[], label: string = "") {
//   const hash = ((Math.random() * 100) ^ 0) + "";
//   const escapedNamesString = statesNames.map(name => `"${name}";`).join("");
//   return `
//     subgraph cluster_${hash}_choices {
//         style=rounded;
//         color=lightgrey;
//         node [style=filled,color=white];
//         label = "${label}";
//         ${escapedNamesString}
//     }`;
// }
function makeSubgraph(statesNames, label = "") {
    const subgraphName = `cluster_${((Math.random() * 100) ^ 0) + ""}`;
    const escapedNamesString = statesNames.map(name => `"${name}";`).join("");
    const subgraph = `
    subgraph ${subgraphName} {
        style=rounded;
        label = "${label}";
        ${escapedNamesString}
    }`;
    return {
        subgraph,
        subgraphName
    };
}
function makeTransition(fromStateName, toStateName, fromClusterName, toClusterName) {
    if (fromClusterName && toClusterName) {
        return `"${fromStateName}" -> "${toStateName}" [ltail="${fromClusterName}" lhead=${toClusterName}];`;
    }
    if (fromClusterName && !toClusterName) {
        return `"${fromStateName}" -> "${toStateName}" [ltail="${fromClusterName}"];`;
    }
    return `"${fromStateName}" -> "${toStateName}";`;
}
function makeCatchTransition(fromStateName, toStateName) {
    return `"${fromStateName}" -> "${toStateName}" [color=red];`;
}
function visualize(stepFunction) {
    return __awaiter(this, void 0, void 0, function* () {
        const str = `
    digraph {
        compound=true;

        ${buildTransitions(stepFunction).subgraph}
        "${stepFunction.StartAt}" [style=filled, fillcolor="#FED362"];
        "${getEndStateName(stepFunction)}" [style=filled, fillcolor="#FED362"];
        ${color_task_failure_steps(stepFunction)}
        { rank = sink; "${getEndStateName(stepFunction)}"; }
        { rank = source; "${stepFunction.StartAt}"; }

        

    }
    `;
        // console.log(str);
        return yield viz.renderString(str);
    });
}
exports.default = visualize;
//# sourceMappingURL=visualize.js.map