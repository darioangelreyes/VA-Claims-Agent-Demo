#!/usr/bin/env python3
"""Create a small test cluster with 15-minute auto-termination."""

import os
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.compute import (
    AutoScale,
    ClusterSpec,
    DataSecurityMode,
    RuntimeEngine,
)
from dotenv import load_dotenv
import sys
import traceback

# Load environment variables
load_dotenv('.env.local')
load_dotenv('.env')

def create_test_cluster():
    """Create a small test cluster with auto-termination."""
    try:
        # Configure authentication
        host = os.getenv('DATABRICKS_HOST')
        token = os.getenv('DATABRICKS_TOKEN')
        
        if not host or not token:
            print("❌ DATABRICKS_HOST and DATABRICKS_TOKEN must be set")
            sys.exit(1)
        
        # Clean up host URL (remove query params)
        if '?' in host:
            host = host.split('?')[0]
        
        print(f"🔗 Connecting to: {host}")
        
        client = WorkspaceClient(host=host, token=token)
        
        print("🚀 Creating test cluster...")
        
        # Get the latest LTS Spark version
        print("   Finding latest Spark version...")
        spark_version = client.clusters.select_spark_version(latest=True, long_term_support=True)
        print(f"   Using Spark version: {spark_version}")
        
        # Get smallest available node type
        print("   Finding smallest node type...")
        node_type = client.clusters.select_node_type(local_disk=True, min_memory_gb=4)
        print(f"   Using node type: {node_type}")
        
        # Create cluster with minimal configuration
        cluster = client.clusters.create(
            cluster_name="test-cluster-15min",
            spark_version=spark_version,
            node_type_id=node_type,
            autotermination_minutes=15,
            num_workers=0,  # Single node cluster (driver only)
            data_security_mode=DataSecurityMode.SINGLE_USER,
            runtime_engine=RuntimeEngine.STANDARD,
        )
        
        print(f"\n✅ Cluster created successfully!")
        print(f"   Cluster ID: {cluster.cluster_id}")
        print(f"   Cluster Name: test-cluster-15min")
        print(f"   Auto-terminate: 15 minutes")
        print(f"   Configuration: Single-node (driver only)")
        print(f"\n⏳ Cluster is starting... (this may take a few minutes)")
        
        # Wait for cluster to be running
        print(f"   Waiting for cluster to start...")
        client.clusters.wait_get_cluster_running(cluster.cluster_id)
        
        print(f"\n🎉 Cluster is now RUNNING!")
        print(f"   You can view it in your Databricks workspace")
        print(f"   {host}/#setting/clusters/{cluster.cluster_id}/configuration")
        
        return cluster.cluster_id
        
    except Exception as e:
        print(f"\n❌ Error creating cluster: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    create_test_cluster()

