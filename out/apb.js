"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { apb } from "./interfaces";
const _ = require('lodash');
// let Parameters = {}
//TODO: Validate that constructor input contains all the fields that are needed
const RETRY = {
    "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
    "IntervalSeconds": 2,
    "MaxAttempts": 6,
    "BackoffRate": 2
};
class apb {
    constructor(definition) {
        this.DecoratorFlags = {
            TaskFailureHandlerName: '_Handle_Task_Failure',
            TaskFailureHandlerStartLabel: '_Task_Failed',
            TaskFailureHandlerEndLabel: '_End_With_Failure'
        };
        this.transformStateMachine(definition);
    }
    isStateIntegration(stateName, States = this.States) {
        if (States[stateName] === undefined) {
            throw new Error(`State ${stateName} does not exist in the States object`);
        }
        return (States[stateName].Type === "Task" || States[stateName].Type === "Interaction") && _.has(States[stateName], 'Parameters');
    }
    genIntegrationHelperStateName(originalName) {
        return `helper_${originalName.toLowerCase()}`.slice(0, 128);
    }
    genHelperState(stateConfig, stateName) {
        let helperState = {
            Type: "Pass",
            Result: {
                "Name": stateName,
                "Parameters": stateConfig.Parameters
            },
            ResultPath: "$.State_Config",
            Next: stateName
        };
        return helperState;
    }
    resolveStateName(stateName, States = this.States) {
        if (this.isStateIntegration(stateName, States)) {
            return this.genIntegrationHelperStateName(stateName);
        }
        else {
            return stateName;
        }
    }
    transformChoiceState(stateName, stateConfig, States = this.States) {
        let choices = [];
        _.forEach(stateConfig.Choices, (choice) => {
            choices.push(Object.assign({}, choice, { Next: this.resolveStateName(choice.Next, States) }));
        });
        return {
            [stateName]: Object.assign({}, stateConfig, { Choices: choices })
        };
    }
    transformPassState(stateName, stateConfig, States = this.States) {
        if (_.has(stateConfig, 'Next')) {
            return {
                [stateName]: Object.assign({}, stateConfig, { Next: this.resolveStateName(stateConfig.Next, States) })
            };
        }
        else {
            return {
                [stateName]: Object.assign({}, stateConfig)
            };
        }
    }
    transformWaitState(stateName, stateConfig, States) {
        if (_.has(stateConfig, 'Next')) {
            return {
                [stateName]: Object.assign({}, stateConfig, { Next: this.resolveStateName(stateConfig.Next, States) })
            };
        }
        else {
            return {
                [stateName]: Object.assign({}, stateConfig)
            };
        }
    }
    transformSuccessFailState(stateName, stateConfig, States) {
        if (_.has(stateConfig, 'Next')) {
            return {
                [stateName]: Object.assign({}, stateConfig, { Next: this.resolveStateName(stateConfig.Next, States) })
            };
        }
        else {
            return {
                [stateName]: Object.assign({}, stateConfig)
            };
        }
    }
    transformCatchConfig(catchConfig, States) {
        const catches = [];
        _.forEach(catchConfig, (catchState) => {
            catches.push(Object.assign({}, catchState, { Next: this.resolveStateName(catchState.Next, States) }));
        });
        return catches;
    }
    transformRetryConfig(retryConfig, stateName) {
        const retries = [];
        const currentRetry = JSON.parse(JSON.stringify(RETRY)); // deepcopy
        _.forEach(retryConfig, (retryState) => {
            currentRetry.ErrorEquals = currentRetry.ErrorEquals.filter(e => {
                return !retryState.ErrorEquals.includes(e);
            });
            retries.push(Object.assign({}, retryState));
        });
        if (currentRetry.ErrorEquals.length >= 1 && !this.isDefaultRetryDisabled(stateName)) {
            retries.push(currentRetry);
        }
        return retries;
    }
    isDefaultRetryDisabled(stateName) {
        if (this.Decorators.DisableDefaultRetry) {
            const disable = this.Decorators.DisableDefaultRetry;
            return disable.all || (disable.tasks && disable.tasks.includes(stateName));
        }
        else {
            return false;
        }
    }
    transformTaskState(stateName, stateConfig, States, DecoratorFlags) {
        let output = {};
        let newConfig = Object.assign({}, stateConfig);
        if (_.has(stateConfig, 'Next')) {
            Object.assign(newConfig, { Next: this.resolveStateName(stateConfig.Next, States) });
        }
        if (_.has(stateConfig, 'Catch')) {
            Object.assign(newConfig, { Catch: this.transformCatchConfig(stateConfig.Catch, States) });
        }
        if (_.has(stateConfig, 'Retry')) {
            Object.assign(newConfig, { Retry: this.transformRetryConfig(stateConfig.Retry, stateName) });
        }
        else if (!this.isDefaultRetryDisabled(stateName)) {
            Object.assign(newConfig, { "Retry": [RETRY] });
        }
        if (DecoratorFlags.hasTaskFailureHandler === true && stateName !== this.DecoratorFlags.TaskFailureHandlerName) {
            let currentCatchConfig = newConfig.Catch || [];
            let handlerCatchConfig = [this.genTaskFailureHandlerCatchConfig(stateName)];
            newConfig.Catch = [...currentCatchConfig, ...handlerCatchConfig];
        }
        if (this.isStateIntegration(stateName, States)) {
            // Generate helper state
            const helperState = this.genHelperState(stateConfig, stateName);
            let helperStateName = this.genIntegrationHelperStateName(stateName);
            Object.assign(output, { [helperStateName]: helperState });
        }
        delete newConfig['Parameters'];
        Object.assign(output, { [stateName]: newConfig });
        return output;
    }
    transformInteractionState(stateName, stateConfig, States, DecoratorFlags) {
        let output = {};
        let newConfig = Object.assign({}, stateConfig);
        if (_.has(stateConfig, 'Next')) {
            Object.assign(newConfig, { Next: this.resolveStateName(stateConfig.Next, States) });
        }
        if (_.has(stateConfig, 'Catch')) {
            Object.assign(newConfig, { Catch: this.transformCatchConfig(stateConfig.Catch, States) });
        }
        if (_.has(stateConfig, 'Retry')) {
            Object.assign(newConfig, { Retry: this.transformRetryConfig(stateConfig.Retry, stateName) });
        }
        else if (!this.isDefaultRetryDisabled(stateName)) {
            Object.assign(newConfig, { "Retry": [RETRY] });
        }
        if (DecoratorFlags.hasTaskFailureHandler === true && stateName !== this.DecoratorFlags.TaskFailureHandlerName) {
            let currentCatchConfig = newConfig.Catch || [];
            let handlerCatchConfig = [this.genTaskFailureHandlerCatchConfig(stateName)];
            newConfig.Catch = [...currentCatchConfig, ...handlerCatchConfig];
        }
        if (this.isStateIntegration(stateName, States)) {
            // Generate helper state and set Invoke lambda resource
            const helperState = this.genHelperState(stateConfig, stateName);
            let helperStateName = this.genIntegrationHelperStateName(stateName);
            Object.assign(output, { [helperStateName]: helperState });
        }
        // Convert Interaction to Task
        newConfig.Parameters = {
            FunctionName: newConfig.Resource,
            Payload: {
                "sfn_context.$": "$",
                "task_token.$": "$$.Task.Token"
            }
        };
        newConfig.Resource = "arn:aws:states:::lambda:invoke.waitForTaskToken";
        newConfig.Type = "Task";
        Object.assign(output, { [stateName]: newConfig });
        return output;
    }
    transformParallelState(stateName, stateConfig, States, DecoratorFlags) {
        let Output = {};
        let { Branches, End } = stateConfig, topLevel = __rest(stateConfig, ["Branches", "End"]);
        let helperStateName = `merge_${stateName.toLowerCase()}`.slice(0, 128);
        let helperState = {
            Type: "Task",
            Resource: "${{self:custom.core.MergeParallelOutput}}"
        };
        if (End === undefined) {
            Object.assign(helperState, { Next: this.resolveStateName(stateConfig.Next, States) });
        }
        else {
            Object.assign(helperState, { End: true });
        }
        if (DecoratorFlags.hasTaskFailureHandler === true) {
            let currentCatchConfig = topLevel.Catch || [];
            let handlerCatchConfig = [this.genTaskFailureHandlerCatchConfig(stateName)];
            topLevel.Catch = [...currentCatchConfig, ...handlerCatchConfig];
        }
        let newBranches = [];
        Object.assign(Output, topLevel, { Next: helperStateName });
        _.forEach(Branches, (branch) => {
            newBranches.push({
                StartAt: this.resolveStateName(branch.StartAt, branch.States),
                States: this.transformStates(States = branch.States, DecoratorFlags = {})
            });
        });
        Object.assign(Output, { Branches: newBranches });
        return {
            [stateName]: Output,
            [helperStateName]: helperState
        };
    }
    validateTaskFailureHandlerDecorator(config) {
        if (config.Type === "Task" || config.Type === "Parallel") {
            return true;
        }
        else {
            throw new Error("Decorator.TaskFailureHandler configured incorrectly. Must be a Task or Parallel state");
        }
    }
    genTaskFailureHandlerCatchConfig(stateName) {
        return {
            "ErrorEquals": ["States.TaskFailed"],
            "ResultPath": `$.errors.${stateName}`,
            "Next": this.DecoratorFlags.TaskFailureHandlerStartLabel
        };
    }
    transformStates(States = this.States, DecoratorFlags = this.DecoratorFlags) {
        let output = {};
        _.forOwn(States, (stateConfig, stateName, States) => {
            if (stateConfig.Type === "Choice") {
                Object.assign(output, this.transformChoiceState(stateName, stateConfig, States));
            }
            else if (stateConfig.Type === "Pass") {
                Object.assign(output, this.transformPassState(stateName, stateConfig, States));
            }
            else if (stateConfig.Type === "Wait") {
                Object.assign(output, this.transformWaitState(stateName, stateConfig, States));
            }
            else if (stateConfig.Type === "Succeed" || stateConfig.Type === "Fail") {
                Object.assign(output, this.transformSuccessFailState(stateName, stateConfig, States));
            }
            else if (stateConfig.Type === "Task") {
                Object.assign(output, this.transformTaskState(stateName, stateConfig, States, DecoratorFlags));
            }
            else if (stateConfig.Type === "Interaction") {
                Object.assign(output, this.transformInteractionState(stateName, stateConfig, States, DecoratorFlags));
            }
            else if (stateConfig.Type === "Parallel") {
                Object.assign(output, this.transformParallelState(stateName, stateConfig, States, DecoratorFlags));
            }
        });
        return output;
    }
    validateDefinition(definition) {
        const REQUIRED_FIELDS = ['Playbook', 'Comment', 'StartAt', 'States'];
        let keys = Object.keys(definition);
        _.forEach(REQUIRED_FIELDS, (key) => {
            if (!keys.includes(key)) {
                throw new Error(`Playbook definition does not have the required top-level key, '${key}'`);
            }
        });
    }
    taskErrorHandlerExists() {
        return this.Decorators.TaskFailureHandler && this.validateTaskFailureHandlerDecorator(this.Decorators.TaskFailureHandler);
    }
    genTaskFailureHandlerStates(TaskFailureHandler) {
        delete TaskFailureHandler.End;
        TaskFailureHandler.Next = this.DecoratorFlags.TaskFailureHandlerEndLabel;
        return {
            [this.DecoratorFlags.TaskFailureHandlerStartLabel]: {
                "Type": "Pass",
                "Next": this.DecoratorFlags.TaskFailureHandlerName
            },
            [this.DecoratorFlags.TaskFailureHandlerName]: TaskFailureHandler,
            [this.DecoratorFlags.TaskFailureHandlerEndLabel]: {
                "Type": 'Fail'
            }
        };
    }
    transformStateMachine(definition) {
        this.validateDefinition(definition);
        let { Playbook, States, Decorators } = definition, topLevel = __rest(definition, ["Playbook", "States", "Decorators"]);
        this.Decorators = Decorators || {};
        if (this.Decorators) {
            // Check for TaskFailureHandler Decorator and modify 'States' accordingly
            if (this.taskErrorHandlerExists()) {
                this.DecoratorFlags.hasTaskFailureHandler = true;
                Object.assign(States, this.genTaskFailureHandlerStates(this.Decorators.TaskFailureHandler));
            }
            else {
                this.DecoratorFlags.hasTaskFailureHandler = false;
            }
        }
        this.States = States;
        this.PlaybookName = Playbook;
        this.StateMachine = {
            "StartAt": "default",
            "States": {
                "Beginning": {
                    "Type": "Pass",
                    "Next": "default"
                }
            }
        };
        this.StateMachineYaml = {
            Resources: {
                [this.PlaybookName]: {
                    Type: "AWS::StepFunctions::StateMachine",
                    Properties: {
                        RoleArn: "${{self:custom.statesRole}}",
                        DefinitionString: {
                            "Fn::Sub:": ""
                        }
                    }
                }
            },
            Outputs: {
                [this.PlaybookName]: {
                    Description: topLevel.Comment,
                    Value: {
                        Ref: this.PlaybookName
                    }
                }
            }
        };
        Object.assign(this.StateMachine, topLevel, { States: this.transformStates(), StartAt: this.resolveStateName(topLevel.StartAt) });
        this.StateMachineYaml = {
            Resources: {
                [this.PlaybookName]: {
                    Type: "AWS::StepFunctions::StateMachine",
                    Properties: {
                        RoleArn: "${{self:custom.statesRole}}",
                        StateMachineName: this.PlaybookName,
                        DefinitionString: {
                            "Fn::Sub": JSON.stringify(this.StateMachine, null, 4)
                        }
                    }
                }
            },
            Outputs: {
                [this.PlaybookName]: {
                    Description: topLevel.Comment,
                    Value: {
                        Ref: this.PlaybookName
                    }
                }
            }
        };
    }
}
exports.default = apb;
//# sourceMappingURL=apb.js.map