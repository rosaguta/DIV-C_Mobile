import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots


# Create figure with secondary y-axis
fig = make_subplots(specs=[[{"secondary_y": True}]])
df = pd.read_csv('./performance_log.csv')
# Add traces
fig.add_trace(
    go.Scatter(x=df.Timestamp, y=df.CPU_Usage, name="CPU"),
    secondary_y=False,
)

fig.add_trace(
    go.Scatter(x=df.Timestamp, y=df.Memory_Usage_KB, name="MEM"),
    secondary_y=True,
)

# Add figure title
fig.update_layout(
    title_text="CPU and MEM usage on the Samsung Galaxy S24"
)

# Set x-axis title
fig.update_xaxes(title_text="Timestamp")

# Set y-axes titles
fig.update_yaxes(title_text="<b>CPU percentage</b> ", secondary_y=False)
fig.update_yaxes(title_text="<b>MEM in kb</b>", secondary_y=True)

fig.show()





# fig = px.line(df, x = 'Timestamp', y = 'CPU_Usage', title='CPU and MEM usage')
# fig.show()
