export abstract class PackageManager {
	public abstract install(...packages: string[]): Promise<boolean>;
	public abstract uninstall(...packages: string[]): Promise<boolean>;
	public abstract update(...packages: string[]): Promise<boolean>;
	public abstract rebuild(...packages: string[]): Promise<boolean>;
}
