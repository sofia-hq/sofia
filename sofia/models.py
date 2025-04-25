"""Models for Sofia."""

# Models
class Action(Enum):
    MOVE = "move_to_next_step"
    ANSWER = "provide_answer"
    ASK = "ask_additional_info"
    TOOL_CALL = "call_tool"

class Route(BaseModel):
    target: str
    condition: str

class Step(BaseModel):
    step_id: str
    description: str
    routes: List[Route] = []
    available_tools: List[str] = []

    def get_available_routes(self) -> List[str]:
        return [route.target for route in self.routes]
    
class Message(BaseModel):
    role: str
    content: str