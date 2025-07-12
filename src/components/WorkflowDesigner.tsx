// import { useCallback, useState } from 'react';
// import {
//   ReactFlow,
//   MiniMap,
//   Controls,
//   Background,
//   useNodesState,
//   useEdgesState,
//   addEdge,
//   Connection,
//   Edge,
//   Node,
//   BackgroundVariant,
// } from '@xyflow/react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Save, Play, Download, Upload, Zap, Mail, CheckCircle, Users } from 'lucide-react';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { toast } from '@/hooks/use-toast';

// import '@xyflow/react/dist/style.css';

// const initialNodes: Node[] = [
//   {
//     id: '1',
//     type: 'input',
//     data: { label: 'Lead Created' },
//     position: { x: 100, y: 100 },
//     className: 'node-trigger',
//   },
//   {
//     id: '2',
//     data: { label: 'Send Welcome Email' },
//     position: { x: 300, y: 100 },
//     className: 'node-action',
//   },
// ];

// const initialEdges: Edge[] = [
//   { id: 'e1-2', source: '1', target: '2' },
// ];

// interface WorkflowLog {
//   id: string;
//   workflow: string;
//   trigger: string;
//   status: 'success' | 'failed' | 'running';
//   timestamp: Date;
//   details: string;
// }

// export const WorkflowDesigner = () => {
//   const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
//   const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
//   const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
//   const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);

//   const triggerNodes = [
//     { type: 'trigger', icon: Zap, label: 'Lead Created', color: 'bg-success' },
//     { type: 'trigger', icon: CheckCircle, label: 'Status Changed', color: 'bg-success' },
//     { type: 'trigger', icon: Users, label: 'Lead Updated', color: 'bg-success' },
//   ];

//   const actionNodes = [
//     { type: 'action', icon: Mail, label: 'Send Email', color: 'bg-primary' },
//     { type: 'action', icon: CheckCircle, label: 'Update Status', color: 'bg-primary' },
//     { type: 'action', icon: Users, label: 'Create Task', color: 'bg-primary' },
//   ];

//   const onConnect = useCallback(
//     (params: Connection) => setEdges((eds) => addEdge(params, eds)),
//     [setEdges],
//   );

//   const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
//     event.dataTransfer.setData('application/reactflow', nodeType);
//     event.dataTransfer.setData('application/nodelabel', label);
//     setSelectedNodeType(nodeType);
//   };

//   const onDrop = useCallback(
//     (event: React.DragEvent) => {
//       event.preventDefault();

//       const type = event.dataTransfer.getData('application/reactflow');
//       const label = event.dataTransfer.getData('application/nodelabel');

//       if (!type) return;

//       const position = {
//         x: event.clientX - 200,
//         y: event.clientY - 200,
//       };

//       const newNode: Node = {
//         id: `${Date.now()}`,
//         type: type === 'trigger' ? 'input' : 'default',
//         position,
//         data: { label },
//         className: type === 'trigger' ? 'node-trigger' : 'node-action',
//       };

//       setNodes((nds) => nds.concat(newNode));
//     },
//     [setNodes],
//   );

//   const onDragOver = useCallback((event: React.DragEvent) => {
//     event.preventDefault();
//     event.dataTransfer.dropEffect = 'move';
//   }, []);

//   const saveWorkflow = () => {
//     const workflow = { nodes, edges };
//     localStorage.setItem('crm-workflow', JSON.stringify(workflow));
//     toast({
//       title: "Workflow saved",
//       description: "Your workflow has been saved successfully.",
//     });
//   };

//   const executeWorkflow = () => {
//     const newLog: WorkflowLog = {
//       id: Date.now().toString(),
//       workflow: 'Custom Workflow',
//       trigger: 'Manual Execution',
//       status: 'running',
//       timestamp: new Date(),
//       details: 'Workflow execution started'
//     };
    
//     setWorkflowLogs(prev => [newLog, ...prev]);
    
//     toast({
//       title: "Workflow executing",
//       description: "Your workflow is now running.",
//     });

//     // Simulate completion
//     setTimeout(() => {
//       setWorkflowLogs(prev => 
//         prev.map(log => 
//           log.id === newLog.id 
//             ? { ...log, status: 'success' as const, details: 'Workflow completed successfully' }
//             : log
//         )
//       );
//     }, 3000);
//   };

//   const getStatusBadge = (status: WorkflowLog['status']) => {
//     const variants = {
//       success: 'badge-new',
//       running: 'badge-contacted',
//       failed: 'bg-destructive text-destructive-foreground',
//     };

//     return (
//       <Badge className={variants[status]}>
//         {status.charAt(0).toUpperCase() + status.slice(1)}
//       </Badge>
//     );
//   };

//   return (
//     <div className="space-y-6">
//       {/* Controls */}
//       <Card>
//         <CardHeader>
//           <div className="flex justify-between items-center">
//             <CardTitle>Workflow Designer</CardTitle>
//             <div className="flex space-x-2">
//               <Button variant="outline" onClick={saveWorkflow}>
//                 <Save className="mr-2 h-4 w-4" />
//                 Save
//               </Button>
//               <Button onClick={executeWorkflow} className="btn-brand">
//                 <Play className="mr-2 h-4 w-4" />
//                 Execute
//               </Button>
//             </div>
//           </div>
//         </CardHeader>
//       </Card>

//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//         {/* Node Palette */}
//         <Card className="lg:col-span-1">
//           <CardHeader>
//             <CardTitle className="text-lg">Components</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Trigger Nodes */}
//             <div>
//               <h4 className="text-sm font-medium mb-2 text-success">Triggers</h4>
//               <div className="space-y-2">
//                 {triggerNodes.map((node, index) => (
//                   <div
//                     key={index}
//                     className="flex items-center space-x-2 p-2 border rounded-lg cursor-move hover:bg-muted"
//                     draggable
//                     onDragStart={(e) => onDragStart(e, node.type, node.label)}
//                   >
//                     <div className={`p-1 rounded ${node.color}`}>
//                       <node.icon className="h-4 w-4 text-white" />
//                     </div>
//                     <span className="text-sm">{node.label}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Action Nodes */}
//             <div>
//               <h4 className="text-sm font-medium mb-2 text-primary">Actions</h4>
//               <div className="space-y-2">
//                 {actionNodes.map((node, index) => (
//                   <div
//                     key={index}
//                     className="flex items-center space-x-2 p-2 border rounded-lg cursor-move hover:bg-muted"
//                     draggable
//                     onDragStart={(e) => onDragStart(e, node.type, node.label)}
//                   >
//                     <div className={`p-1 rounded ${node.color}`}>
//                       <node.icon className="h-4 w-4 text-white" />
//                     </div>
//                     <span className="text-sm">{node.label}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Workflow Canvas */}
//         <Card className="lg:col-span-2">
//           <CardContent className="p-0">
//             <div className="h-[500px] w-full">
//               <ReactFlow
//                 nodes={nodes}
//                 edges={edges}
//                 onNodesChange={onNodesChange}
//                 onEdgesChange={onEdgesChange}
//                 onConnect={onConnect}
//                 onDrop={onDrop}
//                 onDragOver={onDragOver}
//                 fitView
//                 className="bg-muted/50"
//               >
//                 <Controls />
//                 <MiniMap />
//                 <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
//               </ReactFlow>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Execution Log */}
//         <Card className="lg:col-span-1">
//           <CardHeader>
//             <CardTitle className="text-lg">Execution Log</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <ScrollArea className="h-[400px]">
//               <div className="space-y-3">
//                 {workflowLogs.map((log) => (
//                   <div key={log.id} className="p-3 border rounded-lg space-y-2">
//                     <div className="flex items-center justify-between">
//                       <span className="text-sm font-medium">{log.workflow}</span>
//                       {getStatusBadge(log.status)}
//                     </div>
//                     <div className="text-xs text-muted-foreground">
//                       <div>Trigger: {log.trigger}</div>
//                       <div>{log.timestamp.toLocaleString()}</div>
//                     </div>
//                     <div className="text-xs bg-muted p-2 rounded">
//                       {log.details}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </ScrollArea>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };


import { useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Play,
  Download,
  Upload,
  Zap,
  Mail,
  CheckCircle,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  {
    id: "1",
    type: "input",
    data: { label: "Lead Created" },
    position: { x: 100, y: 100 },
    className: "node-trigger",
  },
  {
    id: "2",
    data: { label: "Send Welcome Email" },
    position: { x: 300, y: 100 },
    className: "node-action",
  },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

interface WorkflowLog {
  id: string;
  workflow: string;
  trigger: string;
  status: "success" | "failed" | "running";
  timestamp: Date;
  details: string;
}

export const WorkflowDesigner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);

  const triggerNodes = [
    { type: "trigger", icon: Zap, label: "Lead Created", color: "bg-success" },
    {
      type: "trigger",
      icon: CheckCircle,
      label: "Status Changed",
      color: "bg-success",
    },
    {
      type: "trigger",
      icon: Users,
      label: "Lead Updated",
      color: "bg-success",
    },
  ];

  const actionNodes = [
    { type: "action", icon: Mail, label: "Send Email", color: "bg-primary" },
    {
      type: "action",
      icon: CheckCircle,
      label: "Update Status",
      color: "bg-primary",
    },
    { type: "action", icon: Users, label: "Create Task", color: "bg-primary" },
  ];

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    label: string
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/nodelabel", label);
    setSelectedNodeType(nodeType);
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/nodelabel");

      if (!type) return;

      const position = {
        x: event.clientX - 200,
        y: event.clientY - 200,
      };

      const newNode: Node = {
        id: `${Date.now()}`,
        type: type === "trigger" ? "input" : "default",
        position,
        data: { label },
        className: type === "trigger" ? "node-trigger" : "node-action",
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      const nodeIds = nodesToDelete.map((node) => node.id);

      // Remove connected edges when deleting nodes
      setEdges((edges) =>
        edges.filter(
          (edge) =>
            !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
        )
      );

      // Log the deletion
      if (nodesToDelete.length > 0) {
        const newLog: WorkflowLog = {
          id: Date.now().toString(),
          workflow: "Node Management",
          trigger: "Manual Deletion",
          status: "success",
          timestamp: new Date(),
          details: `Deleted ${nodesToDelete.length} node(s): ${nodesToDelete
            .map((n) => n.data.label)
            .join(", ")}`,
        };

        setWorkflowLogs((prev) => [newLog, ...prev]);
      }
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    if (edgesToDelete.length > 0) {
      const newLog: WorkflowLog = {
        id: Date.now().toString(),
        workflow: "Edge Management",
        trigger: "Manual Deletion",
        status: "success",
        timestamp: new Date(),
        details: `Deleted ${edgesToDelete.length} connection(s)`,
      };

      setWorkflowLogs((prev) => [newLog, ...prev]);
    }
  }, []);

  const saveWorkflow = () => {
    const workflow = { nodes, edges };
    localStorage.setItem("crm-workflow", JSON.stringify(workflow));
    toast({
      title: "Workflow saved",
      description: "Your workflow has been saved successfully.",
    });
  };

  const loadWorkflow = () => {
    try {
      const savedWorkflow = localStorage.getItem("crm-workflow");
      if (savedWorkflow) {
        const { nodes: savedNodes, edges: savedEdges } =
          JSON.parse(savedWorkflow);
        setNodes(savedNodes);
        setEdges(savedEdges);

        toast({
          title: "Workflow loaded",
          description: "Your saved workflow has been loaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Load failed",
        description: "Failed to load saved workflow.",
        variant: "destructive",
      });
    }
  };

  const clearWorkflow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);

    const newLog: WorkflowLog = {
      id: Date.now().toString(),
      workflow: "Workflow Management",
      trigger: "Manual Clear",
      status: "success",
      timestamp: new Date(),
      details: "Workflow reset to initial state",
    };

    setWorkflowLogs((prev) => [newLog, ...prev]);

    toast({
      title: "Workflow cleared",
      description: "Workflow has been reset to initial state.",
    });
  };

  const executeWorkflow = () => {
    const newLog: WorkflowLog = {
      id: Date.now().toString(),
      workflow: "Custom Workflow",
      trigger: "Manual Execution",
      status: "running",
      timestamp: new Date(),
      details: `Executing workflow with ${nodes.length} nodes and ${edges.length} connections`,
    };

    setWorkflowLogs((prev) => [newLog, ...prev]);

    toast({
      title: "Workflow executing",
      description: "Your workflow is now running.",
    });

    // Simulate completion
    setTimeout(() => {
      setWorkflowLogs((prev) =>
        prev.map((log) =>
          log.id === newLog.id
            ? {
                ...log,
                status: "success" as const,
                details: "Workflow completed successfully",
              }
            : log
        )
      );
    }, 3000);
  };

  const getStatusBadge = (status: WorkflowLog["status"]) => {
    const variants = {
      success: "badge-new",
      running: "badge-contacted",
      failed: "bg-destructive text-destructive-foreground",
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Workflow Designer</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={loadWorkflow}>
                <Upload className="mr-2 h-4 w-4" />
                Load
              </Button>
              <Button variant="outline" onClick={saveWorkflow}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={clearWorkflow}>
                <Download className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button onClick={executeWorkflow} className="btn-brand">
                <Play className="mr-2 h-4 w-4" />
                Execute
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>• Drag components from the left panel to the canvas</p>
            <p>• Connect nodes by dragging from one to another</p>
            <p>• Select nodes/edges and press Delete key to remove them</p>
            <p>• Save your workflow to preserve your work</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Node Palette */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trigger Nodes */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-success">
                Triggers
              </h4>
              <div className="space-y-2">
                {triggerNodes.map((node, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 border rounded-lg cursor-move hover:bg-muted"
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type, node.label)}
                  >
                    <div className={`p-1 rounded ${node.color}`}>
                      <node.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">{node.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Nodes */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-primary">Actions</h4>
              <div className="space-y-2">
                {actionNodes.map((node, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 border rounded-lg cursor-move hover:bg-muted"
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type, node.label)}
                  >
                    <div className={`p-1 rounded ${node.color}`}>
                      <node.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">{node.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Canvas */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="h-[500px] w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                fitView
                className="bg-muted/50"
                deleteKeyCode={["Backspace", "Delete"]}
              >
                <Controls />
                <MiniMap />
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={12}
                  size={1}
                />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        {/* Execution Log */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {workflowLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {log.workflow}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>Trigger: {log.trigger}</div>
                      <div>{log.timestamp.toLocaleString()}</div>
                    </div>
                    <div className="text-xs bg-muted p-2 rounded">
                      {log.details}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
