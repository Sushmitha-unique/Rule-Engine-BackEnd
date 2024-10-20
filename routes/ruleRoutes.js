const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');

const createAST = (ruleString) => {
    const tokens = ruleString.match(/(\(|\)|AND|OR|\w+\s*[><=]\s*[\w\d']+)/g);
    if (!tokens) {
        throw new Error("Invalid rule string");
    }

    const operatorPrecedence = {
        AND: 2,
        OR: 1
    };

    const outputQueue = [];
    const operatorStack = [];

    tokens.forEach(token => {
        if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.pop(); 
        } else if (['AND', 'OR'].includes(token)) {
            while (operatorStack.length && operatorPrecedence[operatorStack[operatorStack.length - 1]] >= operatorPrecedence[token]) {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.push(token);
        } else {
            outputQueue.push({ type: 'operand', value: token.trim() });
        }
    });

    while (operatorStack.length) {
        outputQueue.push(operatorStack.pop());
    }

    const buildAST = (queue) => {
        const stack = [];
        queue.forEach(token => {
            if (typeof token === 'object') {
                stack.push(token);
            } else {
                const right = stack.pop();
                const left = stack.pop();
                stack.push({
                    type: 'operator',
                    value: token,
                    left,
                    right
                });
            }
        });
        return stack.pop(); 
    };

    return buildAST(outputQueue);
};

router.post('/rules', async (req, res) => {
    const { ruleString } = req.body;

    try {
        const ast = createAST(ruleString);
        const rule = new Rule({ ruleString, ast });
        await rule.save();

        res.status(201).json({
            message: 'Rule created successfully',
            rule: {
                id: rule._id,
                ruleString: rule.ruleString,
                ast: rule.ast,
                createdAt: rule.createdAt,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create rule' });
    }
});

const combineRules = (ruleASTs, operator) => {
    if (ruleASTs.length === 0) return null;

    let combinedAST = ruleASTs[0];

    for (let i = 1; i < ruleASTs.length; i++) {
        combinedAST = {
            type: 'operator',
            value: operator,  
            left: combinedAST,
            right: ruleASTs[i]
        };
    }

    return combinedAST;
};
router.post('/combine-rules', async (req, res) => {
    const { ruleIds, operator } = req.body;

    try {
        const rules = await Rule.find({ _id: { $in: ruleIds } });
        const ruleASTs = rules.map(rule => rule.ast);

        const combinedAST = combineRules(ruleASTs, operator);

        res.status(200).json(combinedAST);
    } catch (error) {
        console.error('Error combining rules:', error);
        res.status(500).json({ error: 'Failed to combine rules' });
    }
});

router.post('/evaluate-rule', (req, res) => {
    const { ast, data } = req.body;

    const evaluateOperand = (operand, data) => {
      const match = operand.match(/(\w+)\s*(>|<|=)\s*(['"\w\d]+)/);
      const [_, attribute, operator, value] = match;
  
      const parsedValue = isNaN(value) ? value.replace(/['"]/g, '') : Number(value);
  
      switch (operator) {
          case '>': return data[attribute] > parsedValue;
          case '<': return data[attribute] < parsedValue;
          case '=': return data[attribute] === parsedValue;
          default: throw new Error(`Unknown operator: ${operator}`);
      }
  };

    const evaluateAST = (node, data) => {
      if (node.type === 'operand') {
          return evaluateOperand(node.value, data);
      } else if (node.type === 'operator') {
          const left = evaluateAST(node.left, data);
          const right = evaluateAST(node.right, data);
          
          switch (node.value) {
              case 'AND': return left && right;
              case 'OR': return left || right;
              default: throw new Error(`Unknown operator: ${node.value}`);
          }
      }
      return false;
  };

    try {
        const result = evaluateAST(ast, data);
        res.status(200).json({ result });
    } catch (error) {
        console.error('Error evaluating rule:', error);
        res.status(500).json({ error: 'Failed to evaluate rule' });
    }
});


router.get('/rules', async (req, res) => {
    try {
        const rules = await Rule.find({});
        res.status(200).json(rules);
    } catch (error) {
        console.error('Error fetching rules:', error);
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});

module.exports = router;
