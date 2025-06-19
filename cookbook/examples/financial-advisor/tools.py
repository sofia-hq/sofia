from typing import List, Union, Dict, Optional
from datetime import datetime


def solve_arithmetic(
    operation: str, numbers: List[float], show_steps: bool = True
) -> Dict[str, Union[float, str]]:
    """
    Solve basic arithmetic operations with optional step-by-step explanation
    """
    steps = []
    result = 0

    if operation == "add":
        result = sum(numbers)
        if show_steps:
            steps = [
                f"Start with {numbers[0]}",
                *[f"Add {num}" for num in numbers[1:]],
                f"Final result: {result}",
            ]
    elif operation == "multiply":
        result = 1
        for num in numbers:
            result *= num
        if show_steps:
            steps = [
                f"Start with {numbers[0]}",
                *[f"Multiply by {num}" for num in numbers[1:]],
                f"Final result: {result}",
            ]

    return {"result": result, "steps": "\n".join(steps) if steps else ""}


def verify_answer(
    expected: float, provided: float, tolerance: float = 0.001
) -> Dict[str, Union[bool, str]]:
    """
    Verify if the provided answer matches the expected result
    """
    is_correct = abs(expected - provided) <= tolerance
    message = (
        "Correct! Well done!"
        if is_correct
        else f"Not quite. The correct answer is {expected}"
    )
    return {"is_correct": is_correct, "message": message}


def get_practice_problem() -> Dict[str, Union[str, List[float], float]]:
    """
    Generate a simple practice problem
    """
    import random

    operations = ["add", "multiply"]
    operation = random.choice(operations)
    numbers = [random.randint(1, 10) for _ in range(2)]

    question = (
        f"What is {numbers[0]} {'+' if operation == 'add' else '×'} {numbers[1]}?"
    )

    return {"question": question, "operation": operation, "numbers": numbers}


# In-memory storage for user financial data
financial_data = {
    "income": [],
    "expenses": [],
    "savings_goals": [],
    "budget_categories": {
        "Housing": 0.3,  # 30% of income
        "Transportation": 0.15,
        "Food": 0.15,
        "Utilities": 0.1,
        "Entertainment": 0.1,
        "Savings": 0.2,
    },
}


def calculate_budget(monthly_income: float) -> Dict[str, float]:
    """
    Calculate recommended budget allocation based on monthly income
    """
    budget = {}
    for category, percentage in financial_data["budget_categories"].items():
        budget[category] = round(monthly_income * percentage, 2)
    return {
        "budget": budget,
        "total": monthly_income,
        "message": "Budget calculated successfully based on standard allocations.",
    }


def add_expense(
    amount: float, category: str, description: str, date: Optional[str] = None
) -> Dict[str, Union[str, float]]:
    """
    Add an expense entry
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    expense = {
        "amount": amount,
        "category": category,
        "description": description,
        "date": date,
    }
    financial_data["expenses"].append(expense)

    return {
        "message": f"Expense of ${amount:.2f} added to {category}",
        "current_total": sum(e["amount"] for e in financial_data["expenses"]),
    }


def get_expense_summary() -> Dict[str, Union[Dict, float]]:
    """
    Get summary of expenses by category
    """
    summary = {}
    for category in financial_data["budget_categories"].keys():
        category_expenses = [
            e["amount"] for e in financial_data["expenses"] if e["category"] == category
        ]
        summary[category] = sum(category_expenses)

    return {"summary": summary, "total": sum(summary.values())}


def set_savings_goal(
    target_amount: float, target_date: str, description: str
) -> Dict[str, Union[str, float]]:
    """
    Set a savings goal with target amount and date
    """
    goal = {
        "target_amount": target_amount,
        "target_date": target_date,
        "description": description,
        "current_amount": 0.0,
    }
    financial_data["savings_goals"].append(goal)

    return {
        "message": f"Savings goal set: ${target_amount:.2f} by {target_date}",
        "monthly_required": calculate_monthly_savings(target_amount, target_date),
    }


def calculate_monthly_savings(target_amount: float, target_date: str) -> float:
    """
    Calculate required monthly savings to reach goal
    """
    target = datetime.strptime(target_date, "%Y-%m-%d")
    months = (target - datetime.now()).days / 30
    if months <= 0:
        return target_amount
    return round(target_amount / months, 2)


def get_financial_health() -> Dict[str, Union[str, float]]:
    """
    Calculate and return financial health metrics
    """
    expenses_total = sum(e["amount"] for e in financial_data["expenses"])
    income_total = sum(financial_data["income"])

    if income_total == 0:
        savings_rate = 0
    else:
        savings_rate = round((income_total - expenses_total) / income_total * 100, 2)

    status = (
        "Good"
        if savings_rate >= 20
        else "Fair" if savings_rate >= 10 else "Needs Improvement"
    )

    return {
        "savings_rate": savings_rate,
        "status": status,
        "total_income": income_total,
        "total_expenses": expenses_total,
        "net_savings": income_total - expenses_total,
    }


tools = [
    solve_arithmetic,
    verify_answer,
    get_practice_problem,
    calculate_budget,
    add_expense,
    get_expense_summary,
    set_savings_goal,
    calculate_monthly_savings,
    get_financial_health,
]

__all__ = ["tools"]
