import { StoragePipelineOptions } from "@azure/storage-blob";

export interface AzureBlobStorageConfig {
  accountUrl: string;
  container: string;
  sasToken?: string;
  options?: StoragePipelineOptions;
  [key: string]: any;
}